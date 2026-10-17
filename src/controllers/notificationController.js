const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({ user_id: userId, read: false });

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ user_id: userId, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const createNotificationHelper = async (userId, title, message, type = 'system') => {
  try {
    if (!userId) return;
    await Notification.create({
      user_id: userId,
      title,
      message,
      type
    });
  } catch (err) {
    console.error('Failed to create notification helper', err);
  }
};

module.exports = { getNotifications, markAllAsRead, createNotificationHelper };
