const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: 'Professional campus service offering.' },
  duration: { type: Number, default: 45 }, // in minutes
  price: { type: Number, required: true },
  type: { type: String, enum: ['single', 'double', 'triple', 'package', 'premium'], default: 'single' },
  category: { type: String, default: 'Beauty & Grooming' },
  location: { type: String, default: 'Campus Studio / Main Salon' },
  stylist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// ── Performance index ──────────────────────────────────────────────────────────
serviceSchema.index({ stylist_id: 1 });   // batched service lookups by expert
serviceSchema.index({ category: 1 });     // category filter queries


serviceSchema.statics.getAll = function() {
  return this.find().populate('stylist_id', 'name email role phone specialty bio rating portfolio workingDays workingHours');
};

serviceSchema.statics.getById = function(id) {
  return this.findById(id);
};

serviceSchema.statics.create = async function(serviceData) {
  const service = new this(serviceData);
  return await service.save();
};

serviceSchema.statics.getByStylist = function(stylistId) {
  if (!stylistId) return this.find({ _id: null });
  const mongoose = require('mongoose');
  const validId = mongoose.Types.ObjectId.isValid(stylistId) ? new mongoose.Types.ObjectId(stylistId) : stylistId;
  return this.find({ $or: [{ stylist_id: stylistId }, { stylist_id: validId }] });
};

serviceSchema.statics.update = function(id, serviceData) {
  return this.findByIdAndUpdate(id, serviceData, { new: true });
};

serviceSchema.statics.delete = function(id) {
  return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Service', serviceSchema);
