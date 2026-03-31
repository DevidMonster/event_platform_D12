const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    userUid: { type: String, trim: true, default: null, index: true },
    userEmail: { type: String, trim: true, lowercase: true, required: true, unique: true, index: true },
    authorName: { type: String, trim: true, default: 'Người dùng' },
    avatarUrl: { type: String, trim: true, default: null },
    provider: { type: String, trim: true, default: 'google' },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null, index: true }
  },
  { timestamps: true, collection: 'users' }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
