const mongoose = require('mongoose');

const gameAttemptSchema = new mongoose.Schema(
  {
    eventSlug: { type: String, required: true, trim: true, index: true },
    gameType: {
      type: String,
      required: true,
      trim: true,
      enum: ['draw', 'wheel', 'quiz', 'flip']
    },
    userUid: { type: String, trim: true, default: null, index: true },
    userEmail: { type: String, trim: true, lowercase: true, default: null, index: true },
    authorName: { type: String, trim: true, default: 'Guest' },
    rewardLabel: { type: String, trim: true, default: '' },
    rewardAmount: { type: Number, default: 0, min: 0 },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

gameAttemptSchema.index({ eventSlug: 1, gameType: 1, createdAt: -1 });

module.exports = mongoose.model('GameAttempt', gameAttemptSchema);
