require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const GameReward = require('../models/GameReward');

const eventSlug = String(process.argv[2] || '8-3-2026').trim();

const rewards = [
  { gameType: 'wheel', label: 'Giải 100K', quantity: 1, weight: 1 },
  { gameType: 'wheel', label: 'Giải 50K', quantity: 3, weight: 1 },
  { gameType: 'wheel', label: 'Giải 20K', quantity: 5, weight: 1 },
  { gameType: 'wheel', label: 'secret', quantity: 1, weight: 1 }
];

async function addWheelRewards() {
  await connectDB();

  await GameReward.updateMany(
    { eventSlug, gameType: 'wheel' },
    { $set: { isActive: false } }
  );

  await Promise.all(
    rewards.map((item) =>
      GameReward.updateOne(
        { eventSlug, gameType: item.gameType, label: item.label },
        {
          $set: {
            eventSlug,
            gameType: item.gameType,
            label: item.label,
            quantity: item.quantity,
            weight: item.weight,
            isActive: true
          }
        },
        { upsert: true }
      )
    )
  );

  const currentPool = await GameReward.find({
    eventSlug,
    gameType: 'wheel',
    isActive: true
  })
    .select({ _id: 0, label: 1, quantity: 1, weight: 1 })
    .sort({ label: 1 })
    .lean();

  console.table(currentPool);
  const total = currentPool.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  console.log(`Done. Event "${eventSlug}" now has ${total} wheel rewards.`);
}

addWheelRewards()
  .catch((error) => {
    console.error('Failed to add wheel rewards:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
