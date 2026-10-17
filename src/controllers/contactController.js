const Message = require('../models/Message');

const submitContactForm = async (req, res, next) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const newMsg = await Message.create({ name, email, message });

        // Notify Master Admin
        const User = require('../models/User');
        const { createNotificationHelper } = require('./notificationController');
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
            await createNotificationHelper(
                adminUser._id,
                'New Inquiry Received 📬',
                `Inquiry from ${name} (${email}): "${message.slice(0, 60)}..."`,
                'system'
            );
        }

        res.status(201).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        next(error);
    }
};

const getAllMessages = async (req, res, next) => {
    try {
        const messages = await Message.getAll();
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

module.exports = { submitContactForm, getAllMessages };
