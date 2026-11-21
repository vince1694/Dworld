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
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route to view active adverts and download media to device
router.get('/', getActiveAdverts);
router.get('/download', downloadMedia);

// Admin routes
router.get('/admin', protect, adminOnly, getAllAdverts);
router.post('/', protect, adminOnly, createAdvert);
router.put('/:id', protect, adminOnly, updateAdvert);
router.patch('/:id/status', protect, adminOnly, toggleAdvertStatus);
router.delete('/:id', protect, adminOnly, deleteAdvert);

module.exports = router;
