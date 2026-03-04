require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Wish = require('../models/Wish');
const ChatMessage = require('../models/ChatMessage');
const GameAttempt = require('../models/GameAttempt');
const Event = require('../models/Event');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const eventSlugArg = args.find((arg) => !arg.startsWith('--')) || '';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function isEmail(value) {
  return value.includes('@');
}

function uniqueStable(values) {
  const seen = new Set();
  const result = [];
  values.forEach((item) => {
    const key = normalize(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(key);
  });
  return result;
}

function normalizeName(value) {
  return String(value || '').trim();
}

function fallbackNameFromEmail(email) {
  const normalizedEmail = normalize(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) return 'Guest';
  return normalizedEmail.split('@')[0] || 'Guest';
}

async function collectUidEmailMap(map, Model, label) {
  let scanned = 0;
  let added = 0;

  const cursor = Model.find({
    userUid: { $exists: true, $ne: null },
    userEmail: { $exists: true, $ne: null }
  })
    .select({ _id: 0, userUid: 1, userEmail: 1 })
    .lean()
    .cursor();

  for await (const doc of cursor) {
    scanned += 1;
    const uid = normalize(doc.userUid);
    const email = normalize(doc.userEmail);
    if (!uid || !email) continue;
    if (isEmail(uid)) continue;
    if (!isEmail(email)) continue;
    if (!map.has(uid)) {
      map.set(uid, email);
      added += 1;
    }
  }

  console.log(`[map:${label}] scanned=${scanned}, added=${added}`);
}

async function collectEmailNameMap(map, Model, label) {
  let scanned = 0;
  let added = 0;

  const cursor = Model.find({
    userEmail: { $exists: true, $ne: null },
    authorName: { $exists: true, $ne: null }
  })
    .select({ _id: 0, userEmail: 1, authorName: 1 })
    .lean()
    .cursor();

  for await (const doc of cursor) {
    scanned += 1;
    const email = normalize(doc.userEmail);
    const authorName = normalizeName(doc.authorName);
    if (!email || !isEmail(email) || !authorName) continue;
    if (!map.has(email)) {
      map.set(email, authorName);
      added += 1;
    }
  }

  console.log(`[name-map:${label}] scanned=${scanned}, added=${added}`);
}

async function resolveWishFilterByEventSlug(eventSlug) {
  const normalizedSlug = normalize(eventSlug);
  if (!normalizedSlug) return {};

  const event = await Event.findOne({ slug: normalizedSlug })
    .select({ _id: 1, slug: 1 })
    .lean();

  if (!event?._id) {
    throw new Error(`Event with slug "${eventSlug}" not found`);
  }

  return { eventId: event._id };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function migrateLikeKeysToEmail() {
  await connectDB();

  const uidToEmail = new Map();
  const emailToName = new Map();
  await collectUidEmailMap(uidToEmail, Wish, 'wish');
  await collectUidEmailMap(uidToEmail, ChatMessage, 'chat');
  await collectUidEmailMap(uidToEmail, GameAttempt, 'game_attempt');
  await collectEmailNameMap(emailToName, Wish, 'wish');
  await collectEmailNameMap(emailToName, ChatMessage, 'chat');
  await collectEmailNameMap(emailToName, GameAttempt, 'game_attempt');

  console.log(`UID->email map size: ${uidToEmail.size}`);

  const filter = await resolveWishFilterByEventSlug(eventSlugArg);
  const query = {
    ...filter,
    likeUserKeys: { $exists: true, $ne: [] }
  };

  const stats = {
    scanned: 0,
    changed: 0,
    convertedKeys: 0,
    unresolvedUidKeys: 0
  };

  let unresolvedSamples = [];
  const bulkOps = [];

  const cursor = Wish.find(query)
    .select({ _id: 1, likeUserKeys: 1, likeUserEmails: 1, likeUserProfiles: 1, likesCount: 1 })
    .lean()
    .cursor();

  for await (const wish of cursor) {
    stats.scanned += 1;

    const currentKeys = uniqueStable(Array.isArray(wish.likeUserKeys) ? wish.likeUserKeys : []);
    const currentEmails = uniqueStable(Array.isArray(wish.likeUserEmails) ? wish.likeUserEmails : []);

    const nextKeysRaw = [];
    let convertedInWish = 0;
    let unresolvedInWish = 0;

    currentKeys.forEach((key) => {
      if (isEmail(key)) {
        nextKeysRaw.push(key);
        return;
      }

      const mappedEmail = uidToEmail.get(key);
      if (mappedEmail) {
        nextKeysRaw.push(mappedEmail);
        convertedInWish += 1;
      } else {
        nextKeysRaw.push(key);
        unresolvedInWish += 1;
        if (unresolvedSamples.length < 20) {
          unresolvedSamples.push(key);
        }
      }
    });

    const nextKeys = uniqueStable(nextKeysRaw);
    const nextEmails = uniqueStable([
      ...currentEmails,
      ...nextKeys.filter((key) => isEmail(key))
    ]).sort();
    const currentProfiles = Array.isArray(wish.likeUserProfiles) ? wish.likeUserProfiles : [];
    const existingByEmail = new Map();
    currentProfiles.forEach((profile) => {
      const email = normalize(profile?.userEmail);
      const name = normalizeName(profile?.userName);
      if (!email || !isEmail(email)) return;
      if (existingByEmail.has(email)) return;
      existingByEmail.set(email, name || fallbackNameFromEmail(email));
    });
    const nextProfiles = nextEmails.map((email) => ({
      userKey: email,
      userEmail: email,
      userName: existingByEmail.get(email) || emailToName.get(email) || fallbackNameFromEmail(email)
    }));
    const nextLikesCount = nextKeys.length;

    const changed =
      !arraysEqual(currentKeys, nextKeys) ||
      !arraysEqual([...currentEmails].sort(), nextEmails) ||
      JSON.stringify(currentProfiles) !== JSON.stringify(nextProfiles) ||
      Number(wish.likesCount || 0) !== nextLikesCount;

    stats.convertedKeys += convertedInWish;
    stats.unresolvedUidKeys += unresolvedInWish;

    if (!changed) continue;
    stats.changed += 1;

    if (dryRun) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: wish._id },
        update: {
          $set: {
            likeUserKeys: nextKeys,
            likeUserEmails: nextEmails,
            likeUserProfiles: nextProfiles,
            likesCount: nextLikesCount
          }
        }
      }
    });

    if (bulkOps.length >= 500) {
      await Wish.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (!dryRun && bulkOps.length > 0) {
    await Wish.bulkWrite(bulkOps, { ordered: false });
  }

  unresolvedSamples = uniqueStable(unresolvedSamples).slice(0, 20);

  console.log('Migration complete');
  console.table({
    dryRun,
    eventSlug: eventSlugArg || 'all',
    scanned: stats.scanned,
    changed: stats.changed,
    convertedKeys: stats.convertedKeys,
    unresolvedUidKeys: stats.unresolvedUidKeys
  });

  if (unresolvedSamples.length > 0) {
    console.log('Unresolved uid key samples (first 20):');
    unresolvedSamples.forEach((item) => console.log(`- ${item}`));
  }

  if (dryRun) {
    console.log('Dry run only. No data was written.');
  }
}

migrateLikeKeysToEmail()
  .catch((error) => {
    console.error('Failed to migrate like keys to email:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
