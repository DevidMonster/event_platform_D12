const mongoose = require('mongoose');

const wishSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    userUid: { type: String, trim: true, index: true, default: null },
    userEmail: { type: String, trim: true, lowercase: true, default: null },
    avatarUrl: { type: String, trim: true, default: null },
    likeUserKeys: { type: [String], default: [] },
    likesCount: { type: Number, default: 0 },
    authorName: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    isApproved: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wish', wishSchema);
