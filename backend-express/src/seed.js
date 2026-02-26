const Event = require('./models/Event');
const GameReward = require('./models/GameReward');
const QuizQuestion = require('./models/QuizQuestion');

async function seedMiniGames(eventSlug) {
  const rewards = [
    { gameType: 'draw', label: 'Voucher 100K', quantity: 5, weight: 1 },
    { gameType: 'draw', label: 'Voucher 50K', quantity: 12, weight: 2 },
    { gameType: 'draw', label: 'Quà lưu niệm 8/3', quantity: 20, weight: 3 },
    { gameType: 'draw', label: 'Chúc bạn may mắn lần sau', quantity: 120, weight: 5 },
    { gameType: 'wheel', label: 'Tiền mặt 200K', quantity: 2, weight: 0.4 },
    { gameType: 'wheel', label: 'Tiền mặt 100K', quantity: 8, weight: 1.4 },
    { gameType: 'wheel', label: 'Voucher cà phê 30K', quantity: 20, weight: 3 },
    { gameType: 'wheel', label: 'Thêm một lượt quay', quantity: 60, weight: 5 },
    { gameType: 'flip', label: 'Bao lì xì 30K', quantity: 15, weight: 1.5 },
    { gameType: 'flip', label: 'Móc khóa may mắn', quantity: 30, weight: 2.5 },
    { gameType: 'flip', label: 'Một lời chúc đặc biệt', quantity: 100, weight: 5 }
  ];

  const questions = [
    {
      prompt: 'Ngày Quốc tế Phụ nữ được kỷ niệm vào ngày nào?',
      options: ['8/2', '8/3', '20/10', '1/6'],
      correctIndex: 1,
      rewardAmount: 20000
    },
    {
      prompt: 'Món quà tinh thần ý nghĩa nhất trong sự kiện 8/3 là gì?',
      options: ['Lời chúc chân thành', 'Đi làm đúng giờ', 'Không nói chuyện', 'Không tham gia'],
      correctIndex: 0,
      rewardAmount: 30000
    },
    {
      prompt: 'Trong 4 kỹ năng này, kỹ năng nào giúp teamwork tốt hơn?',
      options: ['Lắng nghe', 'Phán xét nhanh', 'Im lặng hoàn toàn', 'Tranh luận để thắng'],
      correctIndex: 0,
      rewardAmount: 50000
    }
  ];

  await Promise.all(
    rewards.map((item) =>
      GameReward.updateOne(
        { eventSlug, gameType: item.gameType, label: item.label },
        { $setOnInsert: { ...item, eventSlug } },
        { upsert: true }
      )
    )
  );

  await Promise.all(
    questions.map((item) =>
      QuizQuestion.updateOne(
        { eventSlug, prompt: item.prompt },
        { $setOnInsert: { ...item, eventSlug } },
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
    await seedMiniGames(slug);
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
  await seedMiniGames(slug);
  console.log('Seeded mini games for event: 8-3-2026');
}

module.exports = { seedDefaultEvent };
