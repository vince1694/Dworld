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

        const clientId = (appointment.user_id?._id || appointment.user_id)?.toString();
        const expertId = (appointment.stylist_id?._id || appointment.stylist_id || appointment.service_id?.stylist_id?._id || appointment.service_id?.stylist_id)?.toString();

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

        const clientId = (appointment.user_id?._id || appointment.user_id)?.toString();
        const expertId = (appointment.stylist_id?._id || appointment.stylist_id || appointment.service_id?.stylist_id?._id || appointment.service_id?.stylist_id)?.toString();

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

const getAllUserConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const Service = require('../models/Service');
        let serviceIds = [];
        try {
            const expertServices = await Service.find({ stylist_id: userId }).select('_id').lean();
            serviceIds = expertServices.map(s => s._id);
        } catch (e) {}

        const matchConditions = [
            { user_id: userId },
            { stylist_id: userId }
        ];
        if (serviceIds.length > 0) {
            matchConditions.push({ service_id: { $in: serviceIds } });
        }

        // Find all appointments involving this user
        const appointments = await Appointment.find({
            $or: matchConditions
        })
        .populate('service_id', 'name price duration category image')
        .populate('user_id', 'name email role phone matricNo avatar')
        .populate('stylist_id', 'name email role phone matricNo specialty avatar')
        .sort({ updatedAt: -1 });

        // For each appointment, fetch the last message
        const conversations = await Promise.all(appointments.map(async (apt) => {
            const lastMsg = await AppointmentMessage.findOne({ appointment_id: apt._id })
                .sort({ createdAt: -1 });
            
            const isClient = String(apt.user_id?._id || apt.user_id) === String(userId);
            const otherParty = isClient ? apt.stylist_id : apt.user_id;

            return {
                appointmentId: apt._id,
                service: apt.service_id,
                date: apt.date,
                time: apt.time,
                status: apt.status,
                paymentStatus: apt.paymentStatus,
                isClient,
                otherParty: otherParty || { name: 'Campus Specialist', role: 'expert' },
                lastMessage: lastMsg ? {
                    text: lastMsg.text,
                    photo_url: lastMsg.photo_url,
                    createdAt: lastMsg.createdAt,
                    sender_id: lastMsg.sender_id
                } : null
            };
        }));

        res.json({ success: true, data: conversations });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAppointmentMessages,
    sendAppointmentMessage,
    getAllUserConversations
};
