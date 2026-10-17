const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  is_available: { type: Boolean, default: true }
}, { timestamps: true });

timeSlotSchema.statics.create = async function(date, time) {
  const slot = new this({ date, time });
  return await slot.save();
};

timeSlotSchema.statics.getAvailableByDate = function(date) {
  return this.find({ date, is_available: true });
};

timeSlotSchema.statics.markUnavailable = function(date, time) {
  return this.findOneAndUpdate({ date, time }, { is_available: false }, { new: true });
};

timeSlotSchema.statics.markAvailable = function(date, time) {
  return this.findOneAndUpdate({ date, time }, { is_available: true }, { new: true });
};

timeSlotSchema.statics.getAll = function() {
  return this.find().sort({ date: 1, time: 1 });
};

timeSlotSchema.statics.delete = function(id) {
  return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
