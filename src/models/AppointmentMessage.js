const mongoose = require('mongoose');

const appointmentMessageSchema = new mongoose.Schema({
  appointment_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true,
    index: true
  },
  sender_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    default: '' 
  },
  photo_url: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('AppointmentMessage', appointmentMessageSchema);
