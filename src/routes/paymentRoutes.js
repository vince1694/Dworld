const express = require('express');
const router = express.Router();
const { 
    getPaymentConfig, 
    initializePayment, 
    verifyPayment, 
    paystackWebhook 
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Public config
router.get('/config', getPaymentConfig);

// Authenticated Paystack operations
router.post('/initialize', protect, initializePayment);
router.post('/verify', protect, verifyPayment);

// Webhook endpoint
router.post('/webhook', paystackWebhook);

module.exports = router;
