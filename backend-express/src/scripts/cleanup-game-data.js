require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const GameReward = require('../models/GameReward');
const GameAttempt = require('../models/GameAttempt');
const QuizQuestion = require('../models/QuizQuestion');

const eventSlugArg = String(process.argv[2] || '').trim();
const dropCollections = !process.argv.includes('--data-only');
const deleteAllEvents = !eventSlugArg || eventSlugArg.toLowerCase() === 'all';

function isNamespaceNotFound(error) {
  return String(error?.message || '').toLowerCase().includes('ns not found');
}

async function dropCollectionIfExists(model) {
  try {
    await model.collection.drop();
    console.log(`Dropped collection: ${model.collection.collectionName}`);
  } catch (error) {
    if (!isNamespaceNotFound(error)) throw error;
    console.log(`Collection not found, skipped: ${model.collection.collectionName}`);
  }
}

async function cleanupGameData() {
  await connectDB();

  const filter = deleteAllEvents ? {} : { eventSlug: eventSlugArg };

  const [rewardRes, attemptRes, quizRes] = await Promise.all([
    GameReward.deleteMany(filter),
    GameAttempt.deleteMany(filter),
    QuizQuestion.deleteMany(filter)
  ]);

  console.log(
    `Deleted docs => GameReward: ${rewardRes.deletedCount}, GameAttempt: ${attemptRes.deletedCount}, QuizQuestion: ${quizRes.deletedCount}`
  );

  if (!dropCollections) {
    console.log('Kept collections (ran with --data-only).');
    return;
  }

  if (!deleteAllEvents) {
    console.log(
      `Skipped dropping collections because eventSlug filter "${eventSlugArg}" was used. Use "all" (or no slug) to drop collections.`
    );
    return;
  }

  await dropCollectionIfExists(GameReward);
  await dropCollectionIfExists(GameAttempt);
  await dropCollectionIfExists(QuizQuestion);
}

cleanupGameData()
  .catch((error) => {
    console.error('Failed to cleanup game data:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
