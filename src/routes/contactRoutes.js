const express = require('express');
const { submitContactForm, getAllMessages } = require('../controllers/contactController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', submitContactForm);
router.get('/', protect, adminOnly, getAllMessages); // Only admins should see messages

module.exports = router;
