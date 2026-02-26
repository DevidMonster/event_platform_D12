const mongoose = require('mongoose');

const gameRewardSchema = new mongoose.Schema(
  {
    eventSlug: { type: String, required: true, trim: true, index: true },
    gameType: {
      type: String,
      required: true,
      trim: true,
      enum: ['draw', 'wheel', 'flip']
    },
    label: { type: String, required: true, trim: true, maxlength: 140 },
    quantity: { type: Number, default: 0, min: 0 },
    weight: { type: Number, default: 1, min: 0.01 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

gameRewardSchema.index({ eventSlug: 1, gameType: 1, label: 1 }, { unique: true });

module.exports = mongoose.model('GameReward', gameRewardSchema);
