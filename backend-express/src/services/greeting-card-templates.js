const GreetingCardTemplate = require('../models/GreetingCardTemplate');

const defaultTemplates = [
  {
    templateId: 'rose-blush',
    title: 'Hồng Phấn Nhẹ',
    category: 'Ngọt ngào',
    imageUrl:
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80',
    accent: '#d95f8d',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,242,246,0.28))',
    sortOrder: 10
  },
  {
    templateId: 'ivory-tulip',
    title: 'Tulip Kem',
    category: 'Thanh lịch',
    imageUrl:
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    accent: '#d9a86c',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,247,236,0.28))',
    sortOrder: 20
  },
  {
    templateId: 'lavender-breeze',
    title: 'Lavender Gió Mềm',
    category: 'Dịu dàng',
    imageUrl:
      'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=1200&q=80',
    accent: '#8e79d6',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(244,240,255,0.26))',
    sortOrder: 30
  },
  {
    templateId: 'peony-light',
    title: 'Mẫu Đơn Sáng',
    category: 'Nữ tính',
    imageUrl:
      'https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=1200&q=80',
    accent: '#cf668d',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,240,246,0.28))',
    sortOrder: 40
  },
  {
    templateId: 'blossom-note',
    title: 'Hoa Nở Đầu Ngày',
    category: 'Tri ân',
    imageUrl:
      'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=1200&q=80',
    accent: '#e26e7c',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,245,246,0.27))',
    sortOrder: 50
  },
  {
    templateId: 'garden-whisper',
    title: 'Vườn Hoa Thì Thầm',
    category: 'Bình yên',
    imageUrl:
      'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80&sat=-10',
    accent: '#c66b7a',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,244,244,0.26))',
    sortOrder: 60
  },
  {
    templateId: 'camellia-cream',
    title: 'Trà Mi Kem',
    category: 'Nhẹ nhàng',
    imageUrl:
      'https://images.unsplash.com/photo-1457089328109-e5d9bd499191?auto=format&fit=crop&w=1200&q=80',
    accent: '#d19b7b',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,246,238,0.28))',
    sortOrder: 70
  },
  {
    templateId: 'paper-bloom',
    title: 'Thiệp Hoa Giấy',
    category: 'Ấm áp',
    imageUrl:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
    accent: '#be6487',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,241,245,0.28))',
    sortOrder: 80
  },
  {
    templateId: 'daisy-morning',
    title: 'Cúc Sáng Mai',
    category: 'Tươi vui',
    imageUrl:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
    accent: '#d9a83c',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,249,231,0.27))',
    sortOrder: 90
  },
  {
    templateId: 'magnolia-soft',
    title: 'Mộc Lan Mềm',
    category: 'Trang nhã',
    imageUrl:
      'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=80',
    accent: '#b87899',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(250,241,247,0.27))',
    sortOrder: 100
  },
  {
    templateId: 'petal-ribbon',
    title: 'Ruy Băng Cánh Hoa',
    category: 'Thiệp mời',
    imageUrl:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
    accent: '#cf6b90',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,243,247,0.28))',
    sortOrder: 110
  },
  {
    templateId: 'pearl-garden',
    title: 'Khu Vườn Ngọc',
    category: 'Sang nhẹ',
    imageUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80',
    accent: '#9b7d5f',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(247,241,234,0.28))',
    sortOrder: 120
  }
];

async function seedGreetingCardTemplates() {
  await Promise.all(
    defaultTemplates.map((template) =>
      GreetingCardTemplate.findOneAndUpdate(
        { templateId: template.templateId },
        { $set: { ...template, isActive: true } },
        { upsert: true, new: true }
      )
    )
  );
}

async function listGreetingCardTemplates() {
  return GreetingCardTemplate.find({ isActive: true })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
}

module.exports = {
  defaultTemplates,
  seedGreetingCardTemplates,
  listGreetingCardTemplates
};
