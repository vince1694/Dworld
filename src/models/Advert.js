const mongoose = require('mongoose');

const advertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    enum: ['public_awareness', 'product_feature', 'commercial_video', 'special_promo'],
    default: 'public_awareness'
  },
  mediaType: {
    type: String,
    enum: ['video', 'image', 'embed'],
    default: 'video'
  },
  mediaUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    default: '',
    trim: true
  },
  placement: {
    type: String,
    enum: ['all_campus', 'public_home', 'student_dashboard', 'specialist_directory'],
    default: 'all_campus'
  },
  ctaText: {
    type: String,
    default: 'Learn More',
    trim: true
  },
  ctaLink: {
    type: String,
    default: '/services',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  clicksCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

advertSchema.index({ isActive: 1, placement: 1, priority: -1 });
advertSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Advert', advertSchema);
