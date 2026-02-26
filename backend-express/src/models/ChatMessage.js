const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    eventSlug: { type: String, required: true, index: true },
    userUid: { type: String, trim: true, required: true, index: true },
    userEmail: { type: String, trim: true, lowercase: true, default: null },
    authorName: { type: String, trim: true, required: true },
    avatarUrl: { type: String, trim: true, default: null },
    message: { type: String, trim: true, required: true, maxlength: 800 }
  },
  { timestamps: true }
);

chatMessageSchema.index({ eventSlug: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
