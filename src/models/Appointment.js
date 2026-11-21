const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  stylist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  escrowStatus: { type: String, enum: ['none', 'held', 'released', 'refunded'], default: 'none' },
  escrowReleasedAt: { type: Date, default: null },
  amountPaid: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0.10 },
  commissionAmount: { type: Number, default: 0 },
  expertPayout: { type: Number, default: 0 },
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

// ── Performance indexes ────────────────────────────────────────────────────────
appointmentSchema.index({ user_id: 1, date: -1, time: -1 });      // getByUser sorted
appointmentSchema.index({ user_id: 1, createdAt: -1 });          // getByUser fallback
appointmentSchema.index({ user_id: 1, status: 1 });              // getByUser status filter
appointmentSchema.index({ stylist_id: 1, date: -1, time: -1 });  // getByStylist sorted
appointmentSchema.index({ stylist_id: 1, createdAt: -1 });       // getByStylist fallback
appointmentSchema.index({ stylist_id: 1, status: 1 });          // getByStylist status filter
appointmentSchema.index({ service_id: 1, date: -1, time: -1 });  // getByStylist via service
appointmentSchema.index({ stylist_id: 1, service_id: 1, date: -1, time: -1 });  // getByStylist compound fast lookup
appointmentSchema.index({ status: 1 });                           // status filter
appointmentSchema.index({ date: 1, time: 1 });                    // date/time conflict checks


appointmentSchema.statics.create = async function(appointmentData) {
  let { user_id, service_id, date, time, notes, stylist_id, ...rest } = appointmentData;
  if (!stylist_id) {
    const Service = mongoose.model('Service');
    const service = await Service.findById(service_id);
    if (service) stylist_id = service.stylist_id;
  }
  const apt = new this({ user_id, service_id, date, time, notes, stylist_id, ...rest });
  return await apt.save();
};

appointmentSchema.statics.getByUser = function(userId) {
  return this.find({ user_id: userId })
             .populate('service_id', 'name price location duration category image')
             .populate('stylist_id', 'name email phone specialty bio rating avatar matricNo department address location')
             .sort({ date: -1, time: -1 })
             .lean();
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

appointmentSchema.statics.getByStylist = async function(stylistId, preloadedServiceIds) {
  const mongoose_id = typeof stylistId === 'string'
    ? new mongoose.Types.ObjectId(stylistId)
    : stylistId;

  let serviceIds = preloadedServiceIds;
  if (!serviceIds) {
    const Service = mongoose.model('Service');
    const services = await Service.find({ stylist_id: mongoose_id }).select('_id').lean();
    serviceIds = services.map(x => x._id);
  }

  const query = serviceIds && serviceIds.length > 0
    ? { $or: [{ stylist_id: mongoose_id }, { service_id: { $in: serviceIds } }] }
    : { stylist_id: mongoose_id };

  return this.find(query)
    .select('-__v')
    .populate('user_id',    'name email phone avatar matricNo')
    .populate('service_id', 'name price location duration category image')
    .sort({ date: -1, time: -1 })
    .limit(100)
    .lean();
};

appointmentSchema.statics.checkExists = function(date, time) {
  return this.findOne({ date, time, status: { $ne: 'cancelled' } });
};

module.exports = mongoose.model('Appointment', appointmentSchema);
