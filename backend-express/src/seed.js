const Event = require('./models/Event');
const GameReward = require('./models/GameReward');

async function seedMiniGames(eventSlug) {
  const rewards = [
    { gameType: 'wheel', label: 'Giải 100K', quantity: 1, weight: 1 },
    { gameType: 'wheel', label: 'Giải 50K', quantity: 3, weight: 1 },
    { gameType: 'wheel', label: 'Giải 20K', quantity: 5, weight: 1 },
    { gameType: 'wheel', label: 'secret', quantity: 1, weight: 1 }
  ];

  await GameReward.updateMany({ eventSlug }, { $set: { isActive: false } });

  await Promise.all(
    rewards.map((item) =>
      GameReward.updateOne(
        { eventSlug, gameType: item.gameType, label: item.label },
        {
          $set: { isActive: true, weight: item.weight, quantity: item.quantity },
          $setOnInsert: {
            eventSlug,
            gameType: item.gameType,
            label: item.label
          }
        },
        { upsert: true }
      )
    )
  );
}

async function seedDefaultEvent() {
  const slug = '8-3-2026';
  const defaultPublicUrl = process.env.DEFAULT_EVENT_PUBLIC_URL || 'http://localhost:3001';
  const existing = await Event.findOne({ slug });

  if (existing) {
    if (!existing.publicUrl) {
      existing.publicUrl = defaultPublicUrl;
      await existing.save();
      console.log('Updated default event publicUrl: 8-3-2026');
    }
    return;
  }

  await Event.create({
    name: 'Sự kiện 8/3/2026',
    slug,
    publicUrl: defaultPublicUrl,
    description: 'Chúc mừng ngày Quốc tế Phụ nữ 8/3',
    isActive: true,
    status: 'published',
    startAt: new Date('2026-03-01T00:00:00.000Z'),
    endAt: new Date('2026-03-31T23:59:59.000Z')
  });

  console.log('Seeded default event: 8-3-2026');
}

module.exports = { seedDefaultEvent, seedMiniGames };
