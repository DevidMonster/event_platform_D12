const mongoose = require('mongoose');

const GreetingCardSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true, trim: true },
    recipientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    templateId: { type: String, required: true, trim: true },
    templateTitle: { type: String, trim: true, default: null },
    templateCategory: { type: String, trim: true, default: null },
    imageUrl: { type: String, trim: true, default: null },
    templateAccent: { type: String, trim: true, default: null },
    templateSurface: { type: String, trim: true, default: null },
    aiPrompt: { type: String, trim: true, default: null },
    senderUid: { type: String, trim: true, default: null, index: true },
    senderEmail: { type: String, trim: true, lowercase: true, default: null, index: true },
    senderName: { type: String, trim: true, default: 'Ẩn danh' },
    mailStatus: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'skipped'],
      default: 'queued',
      index: true
    },
    mailError: { type: String, trim: true, default: null },
    mailMessageId: { type: String, trim: true, default: null }
  },
  {
    timestamps: true,
    collection: 'greeting_cards'
  }
);

module.exports = mongoose.models.GreetingCard || mongoose.model('GreetingCard', GreetingCardSchema);
