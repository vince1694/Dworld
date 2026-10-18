const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'payment', 'earning', 'refund', 'refund_deduction'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  reference_id: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'expert', 'admin'], default: 'user' },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  state: { type: String, default: '' },
  address: { type: String, default: '' },
  location: { type: String, default: '' },
  matricNo: { type: String, default: '' },
  bio: { type: String, default: 'Experienced professional specialist.' },
  specialty: { type: String, default: 'General Specialist' },
  department: { type: String, default: 'Cosmetology & Campus Styling' },
  rating: { type: Number, default: 4.9 },
  isVerified: { type: Boolean, default: true },
  walletBalance: { type: Number, default: 0 },
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  workingDays: { 
    type: [String], 
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] 
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' }
  },
  isActivated: { type: Boolean, default: false },
  activationFee: { type: Number, default: 3000 },
  activatedAt: { type: Date, default: null },
  activationReference: { type: String, default: null },
  portfolio: [{
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    category: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now }
  }],
  transactions: [transactionSchema]
}, { timestamps: true });

userSchema.statics.create = async function(userData) {
  const user = new this(userData);
  return await user.save();
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

userSchema.statics.findById = function(id) {
  return this.findOne({ _id: id });
};

userSchema.statics.update = function(id, data) {
  return this.findByIdAndUpdate(id, data, { new: true });
};

userSchema.statics.updatePassword = function(id, hashedPassword) {
  return this.findByIdAndUpdate(id, { password: hashedPassword });
};

userSchema.statics.updatePasswordByEmail = function(email, hashedPassword) {
  return this.findOneAndUpdate({ email }, { password: hashedPassword });
};

module.exports = mongoose.model('User', userSchema);
