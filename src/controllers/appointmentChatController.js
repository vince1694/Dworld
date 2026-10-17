const AppointmentMessage = require('../models/AppointmentMessage');
const Appointment = require('../models/Appointment');
const { createNotificationHelper } = require('./notificationController');

const getAppointmentMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const appointment = await Appointment.findById(id).populate('service_id');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const clientId = appointment.user_id?._id ? appointment.user_id._id.toString() : appointment.user_id?.toString();
        const expertId = appointment.stylist_id?._id ? appointment.stylist_id._id.toString() : appointment.stylist_id?.toString();

        if (req.user.role !== 'admin' && clientId !== userId && expertId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view messages for this appointment' });
        }

        const messages = await AppointmentMessage.find({ appointment_id: id })
            .populate('sender_id', 'name role specialty')
            .sort({ createdAt: 1 });

        res.json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

const sendAppointmentMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { text, photo_url } = req.body;
        const userId = req.user.id;

        if (!text && !photo_url) {
            return res.status(400).json({ success: false, message: 'Message text or photo is required' });
        }

        const appointment = await Appointment.findById(id).populate('service_id');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const clientId = appointment.user_id?._id ? appointment.user_id._id.toString() : appointment.user_id?.toString();
        const expertId = appointment.stylist_id?._id ? appointment.stylist_id._id.toString() : appointment.stylist_id?.toString();

        if (req.user.role !== 'admin' && clientId !== userId && expertId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to post messages for this appointment' });
        }

        const newMsg = await AppointmentMessage.create({
            appointment_id: id,
            sender_id: userId,
            text: text || '',
            photo_url: photo_url || ''
        });

        const populatedMsg = await AppointmentMessage.findById(newMsg._id).populate('sender_id', 'name role specialty');

        // Notify recipient
        const recipientId = (userId === clientId) ? expertId : clientId;
        if (recipientId) {
            const senderName = req.user.name || 'Your specialist/client';
            await createNotificationHelper(
                recipientId,
                'New Appointment Message 💬',
                `${senderName}: "${text ? text.slice(0, 40) : 'Sent a photo reference'}"`,
                'chat'
            );
        }

        res.status(201).json({ success: true, data: populatedMsg });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAppointmentMessages,
    sendAppointmentMessage
};
