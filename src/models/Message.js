const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true }
}, { timestamps: true });

messageSchema.statics.create = async function(data) {
  const msg = new this(data);
  return await msg.save();
};

messageSchema.statics.getAll = function() {
  return this.find().sort({ createdAt: -1 });
};

module.exports = mongoose.model('Message', messageSchema);
