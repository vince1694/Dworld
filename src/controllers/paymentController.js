const https = require('https');
const crypto = require('crypto');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const { sendBookingConfirmationEmail, sendExpertActivationEmail } = require('../utils/sendEmail');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY || '';

// Helper to make HTTPS requests to Paystack API
const paystackRequest = (endpoint, method = 'GET', data = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: endpoint,
            method: method,
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse Paystack response: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

// @desc    Get public key for frontend checkout
// @route   GET /api/payments/config
// @access  Public
const getPaymentConfig = async (req, res) => {
    res.status(200).json({
        success: true,
        publicKey: PAYSTACK_PUBLIC
    });
};

// @desc    Initialize a transaction with Paystack
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = async (req, res, next) => {
    try {
        const { amount, purpose, appointment_id } = req.body;
        const user = req.user;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Please provide a valid amount in Naira' });
        }

        const numericAmount = Number(amount);
        const amountInKobo = Math.round(numericAmount * 100);

        let email = (req.body.email && req.body.email.trim()) || user?.email;
        let name = req.body.name || user?.name || 'D.WORLD Specialist';
        const userId = user?.id || user?._id;

        if (!email && userId) {
            const dbUser = await User.findById(userId);
            if (dbUser) {
                email = dbUser.email;
                name = name || dbUser.name;
            }
        }

        if (!email) {
            return res.status(400).json({ success: false, message: 'A valid email address is required to process Paystack payment.' });
        }

        const clientUrl = process.env.CLIENT_URL || req.headers.origin || 'https://dworld.ink';
        let callbackUrl = req.body.callback_url;
        if (!callbackUrl) {
            callbackUrl = purpose === 'appointment_pay'
                ? `${clientUrl}/book?aptId=${appointment_id || ''}&payment=success`
                : purpose === 'expert_activation'
                    ? `${clientUrl}/expert?activated=1`
                    : (user?.role === 'expert' || user?.role === 'stylist')
                        ? `${clientUrl}/expert?tab=wallet&status=success`
                        : `${clientUrl}/wallet?status=success`;
        }

        const payload = {
            email: email.trim().toLowerCase(),
            amount: amountInKobo,
            currency: 'NGN',
            callback_url: callbackUrl,
            metadata: {
                user_id: userId,
                user_name: name,
                purpose: purpose || 'wallet_topup',
                appointment_id: appointment_id || null
            }
        };

        const response = await paystackRequest('/transaction/initialize', 'POST', payload);

        if (!response.status) {
            return res.status(400).json({
                success: false,
                message: response.message || 'Paystack payment initialization failed'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: response.data.reference
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify Paystack transaction and credit wallet or settle appointment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
    try {
        const { reference } = req.body;
        const currentUserId = req.user.id || req.user._id;

        if (!reference) {
            return res.status(400).json({ success: false, message: 'Transaction reference is required' });
        }

        // ── 1. Verify with Paystack ──────────────────────────────────────────
        const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');

        if (!response.status || response.data.status !== 'success') {
            return res.status(400).json({
                success: false,
                message: response.message || 'Payment verification failed or transaction not completed'
            });
        }

        const data = response.data;
        const amountPaidNaira = data.amount / 100;
        const metadata = data.metadata || {};
        const purpose = metadata.purpose || 'wallet_topup';
        const appointmentIdFromMeta = metadata.appointment_id;

        // ── 2. Load user ─────────────────────────────────────────────────────
        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found' });
        }

        // ── 3. Global idempotency: has this reference been used before? ──────
        const alreadyProcessed = user.transactions && user.transactions.some(t => t.reference_id === reference);

        // Also check if another user processed this reference (replay attack guard)
        if (!alreadyProcessed) {
            const otherUser = await User.findOne({
                'transactions.reference_id': reference,
                _id: { $ne: currentUserId }
            }).select('_id').lean();
            if (otherUser) {
                return res.status(400).json({
                    success: false,
                    message: 'This payment reference has already been processed for another account.'
                });
            }
        }

        // Helper: build full appointment response
        const getAppointmentData = async (aptId) => {
            if (!aptId) return null;
            try {
                return await Appointment.findById(aptId)
                    .populate('service_id')
                    .populate('stylist_id', 'name email phone specialty bio rating avatar matricNo department address location')
                    .populate('user_id', 'name email phone avatar matricNo department')
                    .lean();
            } catch { return null; }
        };

        // ── 4. Already processed — return idempotent success response ────────
        if (alreadyProcessed) {
            const aptData = await getAppointmentData(appointmentIdFromMeta);
            return res.status(200).json({
                success: true,
                message: purpose === 'expert_activation'
                    ? 'Your expert account is already active.'
                    : purpose === 'appointment_pay'
                        ? 'Payment already confirmed. Your booking is secured!'
                        : 'Transaction already processed.',
                amount: amountPaidNaira,
                purpose,
                appointment: aptData,
                data: aptData,
                isActivated: user.isActivated,
                walletBalance: user.walletBalance
            });
        }

        // ── 5. EXPERT ACTIVATION ─────────────────────────────────────────────
        if (purpose === 'expert_activation') {
            user.isActivated = true;
            user.activatedAt = new Date();
            user.activationReference = reference;
            user.transactions.push({
                type: 'payment',
                amount: amountPaidNaira,
                description: 'Expert Account Activation Fee (₦3,000)',
                reference_id: reference
            });
            await user.save();

            // Auto-create first service if none exists
            try {
                const Service = require('../models/Service');
                const existingSvc = await Service.findOne({ stylist_id: user._id });
                if (!existingSvc) {
                    await Service.create({
                        name: user.specialty || 'Barber',
                        description: `${user.name}'s verified campus specialty service.`,
                        price: 3500,
                        duration: 45,
                        type: 'single',
                        category: 'Single Services',
                        location: user.address || user.location || 'Campus Area',
                        stylist_id: user._id
                    });
                }
            } catch (svcErr) {
                console.warn('Service auto-link on activation notice:', svcErr.message);
            }

            await Notification.create({
                user_id: user._id,
                title: 'Expert Account Activated! 🎉',
                message: 'Your D.WORLD expert profile is now active! You can now manage your services, set working hours, and receive client bookings.',
                type: 'system'
            });

            sendExpertActivationEmail(user.email, user.name)
                .catch(err => console.warn('Activation email notice:', err.message));

            return res.status(200).json({
                success: true,
                message: 'Congratulations! Your expert account is now active and unlocked.',
                isActivated: true,
                amount: amountPaidNaira,
                purpose,
                walletBalance: user.walletBalance
            });
        }

        // ── 6. APPOINTMENT PAYMENT ───────────────────────────────────────────
        if (purpose === 'appointment_pay' && appointmentIdFromMeta) {
            const appointment = await Appointment.findById(appointmentIdFromMeta)
                .populate('service_id')
                .populate('stylist_id', 'name email phone specialty bio rating avatar matricNo department address location')
                .populate('user_id', 'name email phone avatar matricNo department');

            if (appointment) {
                const commissionRate = 0.10;
                const commissionAmount = Math.round(amountPaidNaira * commissionRate);
                const expertPayout = amountPaidNaira - commissionAmount;

                // Only update if not already marked paid (webhook may have beaten us)
                if (appointment.paymentStatus !== 'paid') {
                    appointment.paymentStatus = 'paid';
                    appointment.escrowStatus = 'held';
                    appointment.amountPaid = amountPaidNaira;
                    appointment.commissionRate = commissionRate;
                    appointment.commissionAmount = commissionAmount;
                    appointment.expertPayout = expertPayout;
                    await appointment.save();

                    // Expert notification (escrow)
                    let expertId = appointment.stylist_id?._id || appointment.stylist_id || appointment.service_id?.stylist_id;
                    if (expertId) {
                        await Notification.create({
                            user_id: expertId,
                            title: 'New Confirmed Booking! 📅',
                            message: `${user.name} booked "${appointment.service_id?.name || 'Service'}" for ${appointment.date} at ${appointment.time}. ₦${expertPayout.toLocaleString()} is locked in Escrow and will be released to your wallet upon session completion!`,
                            type: 'booking'
                        }).catch(() => {});
                    }

                    // Client notification
                    await Notification.create({
                        user_id: user._id,
                        title: 'Booking Confirmed & Paid! 🎉',
                        message: `Your appointment for "${appointment.service_id?.name || 'Service'}" on ${appointment.date} at ${appointment.time} is confirmed via Paystack. Payment secured in Escrow!`,
                        type: 'payment'
                    }).catch(() => {});

                    // Booking confirmation email
                    sendBookingConfirmationEmail(user.email, user.name, {
                        service: appointment.service_id?.name || 'Campus Specialist Service',
                        date: appointment.date,
                        time: appointment.time,
                        expert: appointment.stylist_id?.name || 'Assigned Specialist'
                    }).catch(err => console.warn('Booking confirmation email notice:', err.message));
                }

                // Record on user's transaction log regardless
                user.transactions.push({
                    type: 'payment',
                    amount: amountPaidNaira,
                    description: `Paystack payment for ${appointment.service_id?.name || 'Appointment'} (Held in D.WORLD Escrow)`,
                    reference_id: reference
                });
                await user.save();

                // Re-fetch with populated fields for response
                const freshApt = await Appointment.findById(appointmentIdFromMeta)
                    .populate('service_id')
                    .populate('stylist_id', 'name email phone specialty bio rating avatar matricNo department address location')
                    .populate('user_id', 'name email phone avatar matricNo department')
                    .lean();

                return res.status(200).json({
                    success: true,
                    message: `Payment of ₦${amountPaidNaira.toLocaleString()} confirmed and secured in D.WORLD Escrow!`,
                    walletBalance: user.walletBalance,
                    amount: amountPaidNaira,
                    purpose,
                    expertPayout: appointment.expertPayout,
                    commissionAmount: appointment.commissionAmount,
                    appointment: freshApt,
                    data: freshApt
                });
            }

            // Appointment not found (unusual) — still record user transaction
            console.warn(`verifyPayment: appointment ${appointmentIdFromMeta} not found for reference ${reference}`);
            user.transactions.push({
                type: 'payment',
                amount: amountPaidNaira,
                description: `Paystack payment for booking (Ref: ${reference})`,
                reference_id: reference
            });
            await user.save();
            return res.status(200).json({
                success: true,
                message: `Payment of ₦${amountPaidNaira.toLocaleString()} received. Contact support if your booking isn't showing confirmed.`,
                walletBalance: user.walletBalance,
                amount: amountPaidNaira,
                purpose
            });
        }

        // ── 7. WALLET TOP-UP (default) ───────────────────────────────────────
        user.walletBalance = (user.walletBalance || 0) + amountPaidNaira;
        user.transactions.push({
            type: 'deposit',
            amount: amountPaidNaira,
            description: `Paystack Live Deposit (${data.channel || 'Card/Bank'})`,
            reference_id: reference
        });
        await user.save();

        await Notification.create({
            user_id: user._id,
            title: 'Wallet Funded! 💳',
            message: `₦${amountPaidNaira.toLocaleString()} has been successfully deposited into your D.WORLD wallet via Paystack.`,
            type: 'payment'
        });

        res.status(200).json({
            success: true,
            message: `₦${amountPaidNaira.toLocaleString()} deposited into your wallet successfully!`,
            walletBalance: user.walletBalance,
            amount: amountPaidNaira,
            purpose
        });
    } catch (error) {
        console.error('verifyPayment error:', error);
        next(error);
    }
};

// @desc    Paystack Webhook Listener for real-time background confirmation
// @route   POST /api/payments/webhook
// @access  Public
const paystackWebhook = async (req, res) => {
    try {
        const secret = PAYSTACK_SECRET;
        const rawPayload = req.rawBody || JSON.stringify(req.body);
        const hash = crypto.createHmac('sha512', secret).update(rawPayload).digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).send('Invalid webhook signature');
        }

        const event = req.body;
        if (event.event === 'charge.success') {
            const data = event.data;
            const reference = data.reference;
            const amountPaidNaira = data.amount / 100;
            const metadata = data.metadata || {};
            const userId = metadata.user_id;

            if (userId) {
                const user = await User.findById(userId);
                if (user && !user.transactions.some(t => t.reference_id === reference)) {
                    if (metadata.purpose === 'expert_activation') {
                        user.isActivated = true;
                        user.activatedAt = new Date();
                        user.activationReference = reference;
                        user.transactions.push({
                            type: 'payment',
                            amount: amountPaidNaira,
                            description: 'Expert Account Activation Fee (₦3,000)',
                            reference_id: reference
                        });
                        await user.save();

                        sendExpertActivationEmail(user.email, user.name)
                            .catch(err => console.warn('Webhook activation email notice:', err.message));
                    } else if (metadata.purpose === 'appointment_pay' && metadata.appointment_id) {
                        const appointment = await Appointment.findById(metadata.appointment_id)
                            .populate('service_id')
                            .populate('stylist_id', 'name email');
                        if (appointment && appointment.paymentStatus !== 'paid') {
                            const commissionRate = 0.10;
                            const commissionAmount = Math.round(amountPaidNaira * commissionRate);
                            const expertPayout = amountPaidNaira - commissionAmount;

                            appointment.paymentStatus = 'paid';
                            appointment.escrowStatus = 'held';
                            appointment.amountPaid = amountPaidNaira;
                            appointment.commissionRate = commissionRate;
                            appointment.commissionAmount = commissionAmount;
                            appointment.expertPayout = expertPayout;
                            await appointment.save();

                            user.transactions.push({
                                type: 'payment',
                                amount: amountPaidNaira,
                                description: `Paystack payment for ${appointment.service_id?.name || 'Appointment'} (Held in D.WORLD Escrow)`,
                                reference_id: reference
                            });
                            await user.save();

                            // Notify expert about escrow
                            const expertId = appointment.stylist_id?._id || appointment.stylist_id || appointment.service_id?.stylist_id;
                            if (expertId) {
                                await Notification.create({
                                    user_id: expertId,
                                    title: 'New Confirmed Booking! 📅',
                                    message: `${user.name} booked "${appointment.service_id?.name || 'Service'}" for ${appointment.date} at ${appointment.time}. ₦${expertPayout.toLocaleString()} is locked in Escrow!`,
                                    type: 'booking'
                                }).catch(() => {});
                            }

                            // Notify client
                            await Notification.create({
                                user_id: user._id,
                                title: 'Booking Confirmed & Paid! 🎉',
                                message: `Your appointment for "${appointment.service_id?.name || 'Service'}" on ${appointment.date} at ${appointment.time} is confirmed. Payment secured in Escrow!`,
                                type: 'payment'
                            }).catch(() => {});

                            // Confirmation email
                            sendBookingConfirmationEmail(user.email, user.name, {
                                service: appointment.service_id?.name || 'Campus Specialist Service',
                                date: appointment.date,
                                time: appointment.time,
                                expert: appointment.stylist_id?.name || 'Assigned Specialist'
                            }).catch(err => console.warn('Webhook booking email notice:', err.message));
                        }
                    } else {
                        user.walletBalance = (user.walletBalance || 0) + amountPaidNaira;
                        user.transactions.push({
                            type: 'deposit',
                            amount: amountPaidNaira,
                            description: `Paystack Deposit (${data.channel})`,
                            reference_id: reference
                        });
                        await user.save();
                    }
                }
            }
        }

        res.status(200).send('Webhook received');
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Webhook processing error');
    }
};

module.exports = {
    getPaymentConfig,
    initializePayment,
    verifyPayment,
    paystackWebhook,
    repairAppointmentPayment
};

// @desc  Admin: Re-verify a Paystack reference and forcibly mark the linked appointment as paid
// @route POST /api/payments/repair
// @access Admin only
async function repairAppointmentPayment(req, res, next) {
    try {
        const { reference, appointment_id } = req.body;
        if (!reference && !appointment_id) {
            return res.status(400).json({ success: false, message: 'Provide reference or appointment_id' });
        }

        let amountPaidNaira = 0;
        let aptId = appointment_id;

        if (reference) {
            const pRes = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');
            if (!pRes.status || pRes.data.status !== 'success') {
                return res.status(400).json({ success: false, message: 'Reference not confirmed by Paystack' });
            }
            amountPaidNaira = pRes.data.amount / 100;
            aptId = aptId || pRes.data.metadata?.appointment_id;
            const userId = pRes.data.metadata?.user_id;

            // Record on user if not already recorded
            if (userId) {
                const u = await User.findById(userId);
                if (u && !u.transactions.some(t => t.reference_id === reference)) {
                    u.transactions.push({
                        type: 'payment',
                        amount: amountPaidNaira,
                        description: `[Admin Repair] Paystack payment for appointment (Ref: ${reference})`,
                        reference_id: reference
                    });
                    await u.save();
                }
            }
        }

        if (!aptId) {
            return res.status(400).json({ success: false, message: 'Could not determine appointment_id' });
        }

        const appointment = await Appointment.findById(aptId)
            .populate('service_id')
            .populate('stylist_id', 'name email');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const wasUnpaid = appointment.paymentStatus !== 'paid';
        const commissionRate = 0.10;
        const amount = amountPaidNaira || appointment.amountPaid || appointment.service_id?.price || 0;
        const commissionAmount = Math.round(amount * commissionRate);
        const expertPayout = amount - commissionAmount;

        appointment.paymentStatus = 'paid';
        appointment.escrowStatus = appointment.escrowStatus === 'none' ? 'held' : appointment.escrowStatus;
        appointment.amountPaid = amount;
        if (!appointment.commissionAmount) appointment.commissionAmount = commissionAmount;
        if (!appointment.expertPayout) appointment.expertPayout = expertPayout;
        await appointment.save();

        if (wasUnpaid) {
            // Notify expert
            const expertId = appointment.stylist_id?._id || appointment.stylist_id || appointment.service_id?.stylist_id;
            if (expertId) {
                await Notification.create({
                    user_id: expertId,
                    title: 'Payment Confirmed for Booking! 📅',
                    message: `Payment confirmed for ${appointment.date} at ${appointment.time}. ₦${expertPayout.toLocaleString()} held in Escrow.`,
                    type: 'booking'
                }).catch(() => {});
            }
            await Notification.create({
                user_id: appointment.user_id,
                title: 'Booking Payment Confirmed! ✅',
                message: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed as paid by admin.`,
                type: 'payment'
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: wasUnpaid ? `Appointment marked as paid. ₦${amount.toLocaleString()} secured in Escrow.` : 'Appointment was already paid.',
            appointment
        });
    } catch (err) {
        console.error('repairAppointmentPayment error:', err);
        next(err);
    }
}
