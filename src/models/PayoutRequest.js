const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  amount: { 
    type: Number, 
    required: true,
    min: 1000
  },
  fee: { 
    type: Number, 
    default: 0 
  },
  netAmount: { 
    type: Number, 
    required: true 
  },
  bankDetails: {
    bankName: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true }
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'completed', 'rejected'], 
    default: 'pending',
    index: true
  },
  reference: { 
    type: String, 
    required: true, 
    unique: true 
  },
  adminNotes: { 
    type: String, 
    default: '' 
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedAt: { 
    type: Date, 
    default: null 
  }
}, { timestamps: true });

payoutRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
