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
    cancelUnpaidAppointment,
    clearBookingHistory,
    rescheduleAppointment,
    getAppointmentById
} = require('../controllers/appointmentController');
const { getAppointmentMessages, sendAppointmentMessage, getAllUserConversations } = require('../controllers/appointmentChatController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// Appointment In-App Messaging & Conversations
router.get('/conversations', protect, getAllUserConversations);
router.get('/:id/messages', protect, getAppointmentMessages);
router.post('/:id/messages', protect, sendAppointmentMessage);

// User routes
router.post('/book', protect, bookAppointment);
router.get('/my-appointments', protect, getUserAppointments);
router.patch('/:id/reschedule', protect, rescheduleAppointment);
router.post('/:id/pay', protect, payAppointment);
// Fix #6: Removed dead /pay-wallet alias (identical handler — caused confusion)
// Fix #5: /clear-history MUST stay above /:id — Express matches routes top-down
// and 'clear-history' would otherwise be swallowed as an :id param.
router.delete('/clear-history', protect, clearBookingHistory);
router.delete('/:id/cancel-unpaid', protect, cancelUnpaidAppointment);
router.delete('/:id', protect, deleteAppointment);
router.get('/slots', getAvailableSlots);

// Admin/Stylist routes
router.get('/stylist-dashboard', protect, getStylistDashboardData);
router.get('/all', protect, adminOnly, getAllAppointments);
router.patch('/:id/status', protect, updateAppointmentStatus);
router.get('/slots/all', protect, adminOnly, getAllSlots);
router.post('/slots', protect, adminOnly, createTimeSlot);
router.delete('/slots/:id', protect, adminOnly, deleteTimeSlot);

// Single appointment lookup (placed after all specific static routes)
router.get('/:id', protect, getAppointmentById);

module.exports = router;
