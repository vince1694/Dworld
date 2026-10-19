const Appointment = require('../models/Appointment');
const TimeSlot = require('../models/TimeSlot');
const Service = require('../models/Service');
const { createNotificationHelper } = require('./notificationController');

const bookAppointment = async (req, res, next) => {
    try {
        let { service_id, date, time, notes, stylist_id, paymentMethod, payment_method } = req.body;
        const selectedPaymentMethod = paymentMethod || payment_method || null;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ success: false, message: 'Please log in to complete your booking.' });
        }

        if (req.user && (req.user.role === 'expert' || req.user.role === 'stylist')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Experts cannot book appointments. Only customer accounts can book appointments.' 
            });
        }

        if (!service_id || !date || !time) {
            return res.status(400).json({ success: false, message: 'Please select a service, date, and time slot.' });
        }

        const cleanServiceId = service_id._id || service_id;

        const User = require('../models/User');
        const mongoose = require('mongoose');

        let service = null;
        if (cleanServiceId && mongoose.Types.ObjectId.isValid(cleanServiceId)) {
            service = await Service.findById(cleanServiceId);
        }

        const targetStylistId = stylist_id || (service ? service.stylist_id : null);

        // Check if slot is taken for that date, time, and specialist
        const conflictQuery = { date, time, status: { $ne: 'cancelled' } };
        if (targetStylistId) {
            conflictQuery.stylist_id = targetStylistId;
        } else if (cleanServiceId) {
            conflictQuery.service_id = cleanServiceId;
        }

        const existing = await Appointment.findOne(conflictQuery);
        if (existing) {
            return res.status(400).json({ success: false, message: 'This date and time slot is already booked for this specialist.' });
        }

        if (targetStylistId) {
            const specialist = await User.findById(targetStylistId);
            const matricRegex = /^LCU\/UG\/\d{2}\/\d{4,5}$/i;
            if (!specialist || !specialist.matricNo || !matricRegex.test(specialist.matricNo.trim())) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: Unverified specialist credentials or invalid Lead City University Matriculation Number.'
                });
            }
        }

        const amount = parseFloat(service?.price || 0);
        let paymentStatus = 'unpaid';
        let amountPaid = 0;
        let commissionRate = 0.10;
        let commissionAmount = 0;
        let expertPayout = 0;
        let clientWalletBalance = undefined;

        // If client chose instant wallet checkout
        if (selectedPaymentMethod === 'wallet') {
            const clientUser = await User.findById(user_id);
            if (!clientUser) {
                return res.status(404).json({ success: false, message: 'Client account not found.' });
            }

            if ((clientUser.walletBalance || 0) < amount) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance (₦${(clientUser.walletBalance || 0).toLocaleString()}). Please top up at least ₦${(amount - (clientUser.walletBalance || 0)).toLocaleString()} or pay via Paystack.`
                });
            }

            commissionAmount = Math.round(amount * commissionRate);
            expertPayout = amount - commissionAmount;

            // Debit client wallet
            clientUser.walletBalance -= amount;
            clientUser.transactions.push({
                type: 'payment',
                amount: amount,
                description: `Payment for ${service?.name || 'Appointment'}`,
                reference_id: `PAY-W-${Date.now()}`
            });
            await clientUser.save();
            clientWalletBalance = clientUser.walletBalance;

            // Credit 90% to Expert Wallet (10% platform fee retained)
            if (targetStylistId) {
                const expertUser = await User.findById(targetStylistId);
                if (expertUser) {
                    expertUser.walletBalance = (expertUser.walletBalance || 0) + expertPayout;
                    expertUser.transactions.push({
                        type: 'earning',
                        amount: expertPayout,
                        description: `Earned from ${clientUser.name} for ${service?.name || 'Service'} (₦${amount.toLocaleString()} - 10% D.WORLD fee ₦${commissionAmount.toLocaleString()})`,
                        reference_id: `EARN-W-${Date.now()}`
                    });
                    await expertUser.save();

                    // Send notification to expert
                    await createNotificationHelper(
                        targetStylistId,
                        'New Confirmed Booking! 📅',
                        `${clientUser.name} booked "${service?.name || 'Service'}" for ${date} at ${time}. Payment of ₦${amount.toLocaleString()} received (₦${expertPayout.toLocaleString()} added to your wallet)!`,
                        'booking'
                    );
                }
            }

            paymentStatus = 'paid';
            amountPaid = amount;
        }

        // Book appointment
        const apt = await Appointment.create({
            user_id,
            service_id: (service ? service._id : cleanServiceId),
            date,
            time,
            notes,
            stylist_id: targetStylistId,
            paymentStatus,
            amountPaid,
            commissionRate,
            commissionAmount,
            expertPayout
        });

        // Mark slot as temporarily reserved
        await TimeSlot.markUnavailable(date, time);

        res.status(201).json({
            success: true,
            message: paymentStatus === 'paid'
                ? `Appointment booked and paid successfully (₦${expertPayout.toLocaleString()} credited to specialist)!`
                : 'Appointment reserved successfully. Awaiting payment.',
            data: apt,
            clientWalletBalance,
            paymentStatus
        });
    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Booking failed. Please try again.' });
    }
};

const getUserAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.getByUser(req.user.id);
        res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
};

const getStylistDashboardData = async (req, res, next) => {
    try {
        const stylistId = req.user.id;
        if (!stylistId) {
            return res.status(400).json({ success: false, message: 'User ID missing from token' });
        }

        const appointments = await Appointment.getByStylist(stylistId);

        // Calculate basic stats
        const totalBookings = appointments.length;
        const pendingRequests = appointments.filter(a => a.status === 'pending').length;
        const totalEarnings = appointments
            .filter(a => (a.status === 'approved' || a.status === 'completed') && a.paymentStatus === 'paid')
            .reduce((sum, a) => sum + (a.expertPayout || (a.service_id?.price ? Math.round(a.service_id.price * 0.9) : 0)), 0);

        res.status(200).json({
            success: true,
            data: {
                appointments: appointments || [],
                stats: {
                    totalBookings: totalBookings || 0,
                    pendingRequests: pendingRequests || 0,
                    totalEarnings: totalEarnings || 0
                }
            }
        });
    } catch (error) {
        console.error('Stylist Dashboard Controller Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching dashboard data',
            error: error.message
        });
    }
};

const getAllAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.getAll();
        res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
};

const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;
        const user = req.user;

        // Get appointment details with service info to verify ownership
        const appointment = await Appointment.findById(appointmentId).populate('service_id');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const service_stylist_id = appointment.service_id ? appointment.service_id.stylist_id : null;

        // Authorization Check: Only the assigned stylist, service owner, an admin, or the client can update
        let isStylist = false;
        if (appointment.stylist_id && appointment.stylist_id.toString() === user.id) isStylist = true;
        if (service_stylist_id && service_stylist_id.toString() === user.id) isStylist = true;
        
        const appointmentUserId = appointment.user_id?._id ? appointment.user_id._id.toString() : appointment.user_id?.toString();
        const isClient = appointmentUserId === user.id;

        if (user.role !== 'admin' && !isStylist && !isClient) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this appointment' });
        }

        if (isClient && user.role !== 'admin' && !isStylist) {
           if (status !== 'cancelled') {
               return res.status(403).json({ success: false, message: 'Clients can only cancel their appointments' });
           }
           // Clients can only cancel appointments that are still pending
           if (appointment.status !== 'pending') {
               return res.status(403).json({ 
                   success: false, 
                   message: `This appointment has been ${appointment.status} by the expert and can no longer be cancelled.` 
               });
           }
        }

        if (status === 'cancelled') {
            await TimeSlot.markAvailable(appointment.date, appointment.time);

            // Automated Refund: If appointment was already paid for, refund client and reverse expert payout
            if (appointment.paymentStatus === 'paid') {
                const User = require('../models/User');
                const refundAmount = appointment.amountPaid || parseFloat(appointment.service_id?.price || 0);
                const expertPayoutToReverse = appointment.expertPayout || (refundAmount * 0.90);

                // 1. Credit 100% back to client's wallet
                const clientUserId = appointment.user_id?._id || appointment.user_id;
                if (clientUserId) {
                    const clientUser = await User.findById(clientUserId);
                    if (clientUser) {
                        clientUser.walletBalance = (clientUser.walletBalance || 0) + refundAmount;
                        clientUser.transactions.push({
                            type: 'refund',
                            amount: refundAmount,
                            description: `100% Refund for cancelled booking: ${appointment.service_id?.name || 'Service'}`,
                            reference_id: `REFUND-${appointment._id}`
                        });
                        await clientUser.save();

                        await createNotificationHelper(
                            clientUserId,
                            'Refund Processed! 💳',
                            `₦${refundAmount.toLocaleString()} has been fully refunded to your D.WORLD wallet for your cancelled booking.`,
                            'payment'
                        );
                    }
                }

                // 2. Reverse credited amount from expert's wallet
                let expertId = appointment.stylist_id || appointment.service_id?.stylist_id;
                if (expertId) {
                    const expertUser = await User.findById(expertId);
                    if (expertUser) {
                        // Fix #3: record the ACTUAL amount deducted (can't go below 0)
                        const currentExpertBal = expertUser.walletBalance || 0;
                        const actualDeducted = Math.min(currentExpertBal, expertPayoutToReverse);
                        expertUser.walletBalance = currentExpertBal - actualDeducted;
                        expertUser.transactions.push({
                            type: 'refund_deduction',
                            amount: actualDeducted,
                            description: `Earnings reversal for cancelled booking: ${appointment.service_id?.name || 'Service'}`,
                            reference_id: `REV-${appointment._id}`
                        });
                        await expertUser.save();

                        await createNotificationHelper(
                            expertId,
                            'Booking Cancelled & Earnings Reversed ⚠️',
                            `Booking on ${appointment.date} was cancelled. ₦${actualDeducted.toLocaleString()} has been reversed from your wallet.`,
                            'payment'
                        );
                    }
                }

                appointment.paymentStatus = 'refunded';
            }
        }

        appointment.status = status;
        await appointment.save();

        // Send notification to Client
        const clientUserId = appointment.user_id?._id || appointment.user_id;
        if (clientUserId) {
            let notifTitle = `Appointment Updated 📋`;
            let notifType = 'approval';
            if (status === 'approved') notifTitle = `Appointment Approved! ✅`;
            if (status === 'completed') { notifTitle = `Service Completed! 🎉`; notifType = 'completion'; }
            if (status === 'cancelled') notifTitle = `Appointment Cancelled ⚠️`;

            await createNotificationHelper(
                clientUserId,
                notifTitle,
                `Your appointment for "${appointment.service_id?.name || 'Service'}" on ${appointment.date} has been marked as ${status}.`,
                notifType
            );
        }

        res.status(200).json({ success: true, message: `Appointment ${status}` });
    } catch (error) {
        next(error);
    }
};

const createTimeSlot = async (req, res, next) => {
    try {
        const { date, time } = req.body;
        await TimeSlot.create(date, time);
        res.status(201).json({ success: true, message: 'Time slot created' });
    } catch (error) {
        next(error);
    }
};

const getAllSlots = async (req, res, next) => {
    try {
        const slots = await TimeSlot.getAll();
        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        next(error);
    }
};

const DEFAULT_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', 
    '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
];

const getAvailableSlots = async (req, res, next) => {
    try {
        const { date, stylist_id } = req.query;
        if (!date) {
            return res.status(200).json({ success: true, availableSlots: DEFAULT_SLOTS, data: DEFAULT_SLOTS });
        }

        const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
        const query = { 
            date, 
            status: { $ne: 'cancelled' },
            $or: [
                { paymentStatus: { $in: ['paid', 'refunded'] } },
                { paymentStatus: 'unpaid', createdAt: { $gte: twentyMinsAgo } }
            ]
        };
        if (stylist_id) {
            query.stylist_id = stylist_id;
        }

        const bookedAppointments = await Appointment.find(query).select('time');
        const bookedTimes = bookedAppointments.map(a => a.time);

        const available = DEFAULT_SLOTS.filter(slot => !bookedTimes.includes(slot));
        res.status(200).json({ success: true, availableSlots: available, data: available });
    } catch (error) {
        next(error);
    }
};

const deleteTimeSlot = async (req, res, next) => {
    try {
        await TimeSlot.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Slot deleted' });
    } catch (error) {
        next(error);
    }
};

const payAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const clientId = req.user.id;

        const User = require('../models/User');
        const appointment = await Appointment.findById(appointmentId).populate('service_id');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Appointment has already been paid for' });
        }

        if (req.user.role !== 'admin' && appointment.user_id?.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Not authorized to pay for this appointment' });
        }

        const amount = parseFloat(appointment.service_id?.price || 0);
        const commissionRate = 0.10; // 10% platform commission cut
        const commissionAmount = Math.round(amount * commissionRate);
        const expertPayout = amount - commissionAmount;

        // Fetch Client User
        const clientUser = await User.findById(clientId);
        if (!clientUser) {
            return res.status(404).json({ success: false, message: 'Client account not found' });
        }

        if ((clientUser.walletBalance || 0) < amount) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance (₦${(clientUser.walletBalance || 0).toLocaleString()}). Please top up at least ₦${(amount - (clientUser.walletBalance || 0)).toLocaleString()}.` 
            });
        }

        // Fix #1: Save client deduction FIRST to prevent race condition
        // (if server crashes after this, deduction is recorded; expert credit can be reconciled)
        clientUser.walletBalance -= amount;
        clientUser.transactions.push({
            type: 'payment',
            amount: amount,
            description: `Payment for ${appointment.service_id?.name || 'Appointment'}`,
            reference_id: `PAY-${appointment._id}`
        });
        await clientUser.save();

        // Credit 90% (expertPayout) to Expert Wallet (10% platform fee retained)
        let expertId = appointment.stylist_id || appointment.service_id?.stylist_id;
        if (expertId) {
            const expertUser = await User.findById(expertId);
            if (expertUser) {
                expertUser.walletBalance = (expertUser.walletBalance || 0) + expertPayout;
                expertUser.transactions.push({
                    type: 'earning',
                    amount: expertPayout,
                    description: `Earned from ${clientUser.name} for ${appointment.service_id?.name || 'Service'} (₦${amount.toLocaleString()} - 10% D.WORLD fee ₦${commissionAmount.toLocaleString()})`,
                    reference_id: `EARN-${appointment._id}`
                });
                await expertUser.save();

                // Send notification to expert
                await createNotificationHelper(
                    expertId,
                    'New Confirmed Booking! 📅',
                    `${clientUser.name} booked "${appointment.service_id?.name || 'Service'}" for ${appointment.date} at ${appointment.time}. Payment of ₦${amount.toLocaleString()} received (₦${expertPayout.toLocaleString()} added to your wallet)!`,
                    'booking'
                );
            }
        }

        appointment.paymentStatus = 'paid';
        appointment.amountPaid = amount;
        appointment.commissionRate = commissionRate;
        appointment.commissionAmount = commissionAmount;
        appointment.expertPayout = expertPayout;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Payment of ₦${amount.toLocaleString()} confirmed (₦${expertPayout.toLocaleString()} disbursed to expert, 10% platform fee retained)!`,
            clientWalletBalance: clientUser.walletBalance,
            expertPayout,
            commissionAmount
        });
    } catch (error) {
        next(error);
    }
};

const deleteAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment record not found' });
        }

        const appointmentUserId = appointment.user_id?.toString();
        const stylistId = appointment.stylist_id?.toString();

        if (req.user.role !== 'admin' && appointmentUserId !== userId && stylistId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this appointment' });
        }

        // If appointment was paid and not completed, issue wallet refund to client before deleting
        if (appointment.paymentStatus === 'paid' && appointment.status !== 'completed') {
            const refundAmount = appointment.amountPaid || 0;
            const User = require('../models/User');
            if (appointment.user_id && refundAmount > 0) {
                const clientUser = await User.findById(appointment.user_id);
                if (clientUser) {
                    clientUser.walletBalance = (clientUser.walletBalance || 0) + refundAmount;
                    clientUser.transactions.push({
                        type: 'refund',
                        amount: refundAmount,
                        description: `100% Refund for deleted booking: ${appointment.service_id?.name || 'Service'}`,
                        reference_id: `REFUND-DEL-${appointment._id}`
                    });
                    await clientUser.save();
                }
            }

            // Reverse expert payout if already credited
            const expertId = appointment.stylist_id;
            const expertPayoutToReverse = appointment.expertPayout || Math.round(refundAmount * 0.9);
            if (expertId && expertPayoutToReverse > 0) {
                const expertUser = await User.findById(expertId);
                if (expertUser) {
                    // Fix #3: log the ACTUAL deducted amount (wallet can't go below 0)
                    const currentBal = expertUser.walletBalance || 0;
                    const actualDeducted = Math.min(currentBal, expertPayoutToReverse);
                    expertUser.walletBalance = currentBal - actualDeducted;
                    expertUser.transactions.push({
                        type: 'refund_deduction',
                        amount: actualDeducted,
                        description: `Payout reversed for deleted booking: ${appointment.service_id?.name || 'Service'}`,
                        reference_id: `REV-DEL-${appointment._id}`
                    });
                    await expertUser.save();
                }
            }
        }

        // Release slot if booking was active
        if (appointment.date && appointment.time) {
            await TimeSlot.markAvailable(appointment.date, appointment.time);
        }

        await Appointment.findByIdAndDelete(appointmentId);
        res.status(200).json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const clearBookingHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Fix #13: Admin no longer wipes ALL records globally (catastrophic bug).
        // Admin uses the admin panel for bulk ops; here they clear their own scoped records.
        if (role === 'expert' || role === 'stylist') {
            await Appointment.deleteMany({ stylist_id: userId, status: { $in: ['completed', 'cancelled'] } });
        } else {
            // user or admin — clear only their own customer bookings
            await Appointment.deleteMany({ user_id: userId, status: { $in: ['completed', 'cancelled'] } });
        }

        res.status(200).json({ success: true, message: 'Booking history cleared successfully' });
    } catch (error) {
        next(error);
    }
};

const rescheduleAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const { date, time } = req.body;
        const userId = req.user.id;

        if (!date || !time) {
            return res.status(400).json({ success: false, message: 'Please select both a new date and time.' });
        }

        const appointment = await Appointment.findById(appointmentId).populate('service_id');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const appointmentUserId = appointment.user_id?.toString();
        const stylistId = appointment.stylist_id?.toString();

        if (req.user.role !== 'admin' && appointmentUserId !== userId && stylistId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to reschedule this appointment' });
        }

        if (['completed', 'cancelled'].includes(appointment.status)) {
            return res.status(400).json({ success: false, message: 'Cannot reschedule a completed or cancelled appointment.' });
        }

        // Check conflict with new date and time
        const conflictQuery = {
            _id: { $ne: appointmentId },
            date,
            time,
            status: { $ne: 'cancelled' }
        };
        if (appointment.stylist_id) {
            conflictQuery.stylist_id = appointment.stylist_id;
        }

        const conflict = await Appointment.findOne(conflictQuery);
        if (conflict) {
            return res.status(400).json({ success: false, message: 'This specialist already has an active appointment for this date and time.' });
        }

        // Release old time slot & mark new
        if (appointment.date && appointment.time) {
            await TimeSlot.markAvailable(appointment.date, appointment.time);
        }
        await TimeSlot.markUnavailable(date, time);

        const oldDate = appointment.date;
        const oldTime = appointment.time;

        appointment.date = date;
        appointment.time = time;
        // Fix #7: If the EXPERT reschedules, keep current status (already confirmed).
        // If the CLIENT reschedules, reset to pending so expert can re-confirm.
        if (userId === appointmentUserId) {
            appointment.status = 'pending';
        }
        // expert rescheduling keeps appointment.status unchanged
        appointment.reminderSent = false;
        await appointment.save();

        // Notify counterpart
        const notifyTarget = userId === appointmentUserId ? stylistId : appointmentUserId;
        if (notifyTarget) {
            const User = require('../models/User');
            const actor = await User.findById(userId);
            await createNotificationHelper(
                notifyTarget,
                'Appointment Rescheduled 🔄',
                `${actor?.name || 'A client'} rescheduled appointment from ${oldDate} at ${oldTime} to ${date} at ${time}.`,
                'booking'
            );
        }

        res.status(200).json({
            success: true,
            message: `Appointment successfully rescheduled to ${date} at ${time}.`,
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

const cancelUnpaidAppointment = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(200).json({ success: true, message: 'Appointment already cleaned up' });
        }

        const appointmentUserId = appointment.user_id?.toString();
        if (req.user.role !== 'admin' && appointmentUserId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this reservation' });
        }

        // If already paid, reject cancel-unpaid (use standard cancel/refund flow instead)
        if (appointment.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Cannot cancel as unpaid: this appointment has already been paid' });
        }

        // Release the time slot immediately so others can book
        if (appointment.date && appointment.time) {
            await TimeSlot.markAvailable(appointment.date, appointment.time);
        }

        await Appointment.findByIdAndDelete(appointmentId);
        res.status(200).json({ success: true, message: 'Unpaid appointment cleanly cancelled and timeslot released' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    bookAppointment,
    getUserAppointments,
    getAllAppointments,
    getStylistDashboardData,
    updateAppointmentStatus,
    createTimeSlot,
    getAvailableSlots,
    getAllSlots,
    deleteTimeSlot,
    payAppointment,
    deleteAppointment,
    cancelUnpaidAppointment,
    clearBookingHistory,
    rescheduleAppointment
};

