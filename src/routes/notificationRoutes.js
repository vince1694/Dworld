const express = require('express');
const { 
  getNotifications, 
  markAllAsRead, 
  markAsRead, 
  deleteNotification, 
  clearAllNotifications 
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);
router.delete('/clear-all', protect, clearAllNotifications);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
