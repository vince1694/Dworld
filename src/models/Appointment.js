const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  stylist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }
}, { timestamps: true });

appointmentSchema.statics.create = async function(appointmentData) {
  let { user_id, service_id, date, time, notes, stylist_id } = appointmentData;
  if (!stylist_id) {
    const Service = mongoose.model('Service');
    const service = await Service.findById(service_id);
    if (service) stylist_id = service.stylist_id;
  }
  const apt = new this({ user_id, service_id, date, time, notes, stylist_id });
  return await apt.save();
};

appointmentSchema.statics.getByUser = function(userId) {
  return this.find({ user_id: userId })
             .populate('service_id')
             .populate('stylist_id', 'name email phone specialty bio rating')
             .sort({ date: -1, time: -1 });
};

appointmentSchema.statics.getAll = function() {
  return this.find()
             .populate('user_id', 'name email')
             .populate('service_id', 'name price location')
             .populate('stylist_id', 'name email specialty')
             .sort({ date: -1, time: -1 });
};

appointmentSchema.statics.updateStatus = function(id, status) {
  return this.findByIdAndUpdate(id, { status }, { new: true });
};

appointmentSchema.statics.getByStylist = function(stylistId) {
  return this.find({ $or: [{ stylist_id: stylistId }] })
             .populate('user_id', 'name email phone')
             .populate('service_id', 'name price location')
             .sort({ date: -1, time: -1 });
};

appointmentSchema.statics.checkExists = function(date, time) {
  return this.findOne({ date, time, status: { $ne: 'cancelled' } });
};

module.exports = mongoose.model('Appointment', appointmentSchema);
