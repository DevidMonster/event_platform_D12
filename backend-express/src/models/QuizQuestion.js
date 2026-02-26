const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    eventSlug: { type: String, required: true, trim: true, index: true },
    prompt: { type: String, required: true, trim: true, maxlength: 300 },
    options: {
      type: [String],
      validate: [(arr) => Array.isArray(arr) && arr.length >= 2, 'At least 2 options are required']
    },
    correctIndex: { type: Number, required: true, min: 0 },
    rewardAmount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

quizQuestionSchema.index({ eventSlug: 1, prompt: 1 }, { unique: true });

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
