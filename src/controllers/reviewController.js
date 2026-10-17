const Review = require('../models/Review');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

const createReview = async (req, res, next) => {
  try {
    const { appointment_id, rating, comment, photo_url } = req.body;
    const client_id = req.user.id;

    const appointment = await Appointment.findById(appointment_id).populate('service_id');
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.user_id.toString() !== client_id) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this appointment' });
    }

    if (appointment.status !== 'completed' || appointment.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Can only review completed and paid appointments' });
    }

    const existingReview = await Review.findOne({ appointment_id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already submitted a review for this appointment' });
    }

    const expert_id = appointment.stylist_id || appointment.service_id?.stylist_id;
    if (!expert_id) {
      return res.status(400).json({ success: false, message: 'Expert reference missing for this service' });
    }

    const newReview = await Review.create({
      client_id,
      expert_id,
      appointment_id,
      rating: parseInt(rating),
      comment: comment || '',
      photo_url: photo_url || ''
    });

    // Recalculate Expert Average Rating
    const allReviews = await Review.find({ expert_id });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(expert_id, { rating: parseFloat(avgRating.toFixed(1)) });

    res.status(201).json({
      success: true,
      message: 'Thank you! Review submitted successfully.',
      data: newReview
    });
  } catch (error) {
    next(error);
  }
};

const getExpertReviews = async (req, res, next) => {
  try {
    const expertId = req.params.id;
    const reviews = await Review.find({ expert_id: expertId })
      .populate('client_id', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getExpertReviews };
