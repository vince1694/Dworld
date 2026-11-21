const express = require('express');
const router = express.Router();
const { 
    getPaymentConfig, 
    initializePayment, 
    verifyPayment, 
    paystackWebhook,
    repairAppointmentPayment
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public config
router.get('/config', getPaymentConfig);

// Authenticated Paystack operations
router.post('/initialize', protect, initializePayment);
router.post('/verify', protect, verifyPayment);

// Admin: repair a payment that Paystack confirmed but our DB missed
router.post('/repair', protect, adminOnly, repairAppointmentPayment);

// Webhook endpoint (public — Paystack sends this directly)
router.post('/webhook', paystackWebhook);

module.exports = router;
