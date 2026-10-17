const express = require('express');
const {
    bookAppointment,
    getUserAppointments,
    getAllAppointments,
    getStylistDashboardData,
    updateAppointmentStatus,
    createTimeSlot,
    getAvailableSlots,
    getAllSlots,
    deleteTimeSlot,
    payAppointment,
    deleteAppointment,
    clearBookingHistory
} = require('../controllers/appointmentController');
const { getAppointmentMessages, sendAppointmentMessage } = require('../controllers/appointmentChatController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// Appointment In-App Messaging
router.get('/:id/messages', protect, getAppointmentMessages);
router.post('/:id/messages', protect, sendAppointmentMessage);

// User routes
router.post('/book', protect, bookAppointment);
router.get('/my-appointments', protect, getUserAppointments);
router.post('/:id/pay', protect, payAppointment);
router.delete('/clear-history', protect, clearBookingHistory);
router.delete('/:id', protect, deleteAppointment);
router.get('/slots', getAvailableSlots);

// Admin/Stylist routes
router.get('/stylist-dashboard', protect, getStylistDashboardData);
router.get('/all', protect, adminOnly, getAllAppointments);
router.patch('/:id/status', protect, updateAppointmentStatus);
router.get('/slots/all', protect, adminOnly, getAllSlots);
router.post('/slots', protect, adminOnly, createTimeSlot);
router.delete('/slots/:id', protect, adminOnly, deleteTimeSlot);

module.exports = router;
