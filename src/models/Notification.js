const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['booking', 'approval', 'completion', 'payment', 'review', 'chat', 'system'], default: 'system' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// ── Performance indexes ────────────────────────────────────────────────────────
notificationSchema.index({ user_id: 1, createdAt: -1 });     // per-user fetch, newest first
notificationSchema.index({ user_id: 1, read: 1 });            // unread count queries


module.exports = mongoose.model('Notification', notificationSchema);
