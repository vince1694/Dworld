const express = require('express');
const { createReview, getExpertReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, createReview);
router.get('/expert/:id', getExpertReviews);

module.exports = router;
