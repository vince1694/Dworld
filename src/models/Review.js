const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  photo_url: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
