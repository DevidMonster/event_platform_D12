const mongoose = require('mongoose');

const GreetingCardTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'Thiệp mời' },
    imageUrl: { type: String, required: true, trim: true },
    accent: { type: String, trim: true, default: '#d95f8d' },
    surface: {
      type: String,
      trim: true,
      default: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,242,246,0.28))'
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    collection: 'greeting_card_templates'
  }
);

module.exports = mongoose.models.GreetingCardTemplate || mongoose.model('GreetingCardTemplate', GreetingCardTemplateSchema);
