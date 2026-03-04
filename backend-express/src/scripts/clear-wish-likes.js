require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Wish = require('../models/Wish');
const Event = require('../models/Event');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const eventSlugArg = args.find((arg) => !arg.startsWith('--')) || '';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

async function resolveFilterByEventSlug(eventSlug) {
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

async function clearWishLikes() {
  await connectDB();

  const filter = await resolveFilterByEventSlug(eventSlugArg);
  const query = {
    ...filter,
    $or: [
      { likesCount: { $gt: 0 } },
      { likeUserKeys: { $exists: true, $ne: [] } },
      { likeUserEmails: { $exists: true, $ne: [] } },
      { likeUserProfiles: { $exists: true, $ne: [] } }
    ]
  };

  const matchedCount = await Wish.countDocuments(query);

  console.table({
    dryRun,
    eventSlug: eventSlugArg || 'all',
    matchedCount
  });

  if (dryRun) {
    console.log('Dry run only. No data was written.');
    return;
  }

  if (matchedCount === 0) {
    console.log('No wish likes to clear.');
    return;
  }

  const result = await Wish.updateMany(query, {
    $set: {
      likesCount: 0,
      likeUserKeys: [],
      likeUserEmails: [],
      likeUserProfiles: []
    }
  });

  console.table({
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0
  });
  console.log('Done. Cleared wish likes successfully.');
}

clearWishLikes()
  .catch((error) => {
    console.error('Failed to clear wish likes:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
