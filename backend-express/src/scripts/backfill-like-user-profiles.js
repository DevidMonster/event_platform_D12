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

function normalizeName(value) {
  return String(value || '').trim();
}

function isEmail(value) {
  return String(value || '').includes('@');
}

function fallbackNameFromEmail(email) {
  const normalizedEmail = normalize(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) return 'Guest';
  return normalizedEmail.split('@')[0] || 'Guest';
}

function uniqueStable(values = []) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(key);
  });

  return result;
}

function normalizeProfiles(list = []) {
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const result = [];

  list.forEach((item) => {
    const userEmail = normalize(item?.userEmail);
    const userKey = normalize(item?.userKey || userEmail);
    const userName = normalizeName(item?.userName) || 'Guest';
    const dedupeKey = userEmail || userKey;
    if (!dedupeKey || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    result.push({
      userKey: userEmail || userKey || null,
      userEmail: userEmail || null,
      userName
    });
  });

  return result;
}

function profileArraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].userKey !== b[i].userKey ||
      a[i].userEmail !== b[i].userEmail ||
      a[i].userName !== b[i].userName
    ) {
      return false;
    }
  }
  return true;
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

async function collectEmailNameMap(map, Model, label) {
  let scanned = 0;
  let updated = 0;

  const cursor = Model.find({
    userEmail: { $exists: true, $ne: null }
  })
    .select({ _id: 0, userEmail: 1, authorName: 1, createdAt: 1 })
    .lean()
    .cursor();

  for await (const doc of cursor) {
    scanned += 1;
    const email = normalize(doc.userEmail);
    if (!email || !isEmail(email)) continue;

    const userName = normalizeName(doc.authorName) || fallbackNameFromEmail(email);
    const createdAt = new Date(doc.createdAt || 0).getTime() || 0;
    const current = map.get(email);

    if (!current || createdAt >= current.createdAt) {
      map.set(email, { userName, createdAt });
      updated += 1;
    }
  }

  console.log(`[source:${label}] scanned=${scanned}, mapped_or_updated=${updated}`);
}

async function backfillLikeUserProfiles() {
  await connectDB();

  const emailNameMap = new Map();
  await collectEmailNameMap(emailNameMap, Wish, 'wish');
  await collectEmailNameMap(emailNameMap, ChatMessage, 'chat_message');
  await collectEmailNameMap(emailNameMap, GameAttempt, 'game_attempt');

  const filter = await resolveWishFilterByEventSlug(eventSlugArg);
  const query = {
    ...filter,
    $or: [
      { likeUserEmails: { $exists: true, $ne: [] } },
      { likeUserKeys: { $exists: true, $ne: [] } },
      { likeUserProfiles: { $exists: true, $ne: [] } }
    ]
  };

  const stats = {
    dryRun,
    eventSlug: eventSlugArg || 'all',
    scanned: 0,
    changed: 0
  };

  const bulkOps = [];
  const cursor = Wish.find(query)
    .select({ _id: 1, likeUserKeys: 1, likeUserEmails: 1, likeUserProfiles: 1 })
    .lean()
    .cursor();

  for await (const wish of cursor) {
    stats.scanned += 1;

    const rawEmails = [
      ...(Array.isArray(wish.likeUserEmails) ? wish.likeUserEmails : []),
      ...(Array.isArray(wish.likeUserKeys) ? wish.likeUserKeys.filter((key) => isEmail(key)) : []),
      ...(Array.isArray(wish.likeUserProfiles)
        ? wish.likeUserProfiles.map((item) => item?.userEmail).filter(Boolean)
        : [])
    ];
    const emailList = uniqueStable(rawEmails).filter((email) => isEmail(email));

    const currentProfiles = normalizeProfiles(wish.likeUserProfiles);
    const preservedNonEmailProfiles = currentProfiles.filter(
      (profile) => !profile.userEmail && profile.userKey && !isEmail(profile.userKey)
    );

    const emailProfiles = emailList.map((email) => ({
      userKey: email,
      userEmail: email,
      userName: emailNameMap.get(email)?.userName || fallbackNameFromEmail(email)
    }));

    const nextProfiles = normalizeProfiles([...preservedNonEmailProfiles, ...emailProfiles]);
    if (profileArraysEqual(currentProfiles, nextProfiles)) continue;

    stats.changed += 1;
    if (dryRun) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: wish._id },
        update: { $set: { likeUserProfiles: nextProfiles } }
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

  console.table(stats);
  if (dryRun) {
    console.log('Dry run only. No data was written.');
  } else {
    console.log('Done. Backfilled likeUserProfiles from like emails.');
  }
}

backfillLikeUserProfiles()
  .catch((error) => {
    console.error('Failed to backfill likeUserProfiles:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
