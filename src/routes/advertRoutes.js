const express = require('express');
const router = express.Router();
const {
  getActiveAdverts,
  getAllAdverts,
  createAdvert,
  updateAdvert,
  toggleAdvertStatus,
  deleteAdvert,
  downloadMedia
} = require('../controllers/advertController');
const { protect, authorize } = require('../middleware/auth');

// Public route to view active adverts and download media to device
router.get('/', getActiveAdverts);
router.get('/download', downloadMedia);

// Admin routes
router.get('/admin', protect, authorize('admin'), getAllAdverts);
router.post('/', protect, authorize('admin'), createAdvert);
router.put('/:id', protect, authorize('admin'), updateAdvert);
router.patch('/:id/status', protect, authorize('admin'), toggleAdvertStatus);
router.delete('/:id', protect, authorize('admin'), deleteAdvert);

module.exports = router;
