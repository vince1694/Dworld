const https = require('https');
const crypto = require('crypto');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');

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

        const clientUrl = process.env.CLIENT_URL || 'https://dworld.ink';
        let callbackUrl = req.body.callback_url;
        if (!callbackUrl) {
            callbackUrl = purpose === 'appointment_pay'
                ? `${clientUrl}/book?aptId=${appointment_id || ''}`
                : purpose === 'expert_activation'
                ? `${clientUrl}/expert?activated=1`
                : `${clientUrl}/dashboard?tab=wallet&status=success`;
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

        // Fix #2: Check reference globally FIRST to prevent any user replaying
        // another user's Paystack reference for a free wallet top-up.
        const globalDuplicate = await User.findOne({ 'transactions.reference_id': reference }).lean();
        if (globalDuplicate) {
            return res.status(200).json({
                success: true,
                message: 'Transaction already processed.',
                walletBalance: (await User.findById(currentUserId).select('walletBalance').lean())?.walletBalance || 0
            });
        }

        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found' });
        }

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

            // Ensure single specialty service is attached to expert
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
                        location: user.address || user.location || 'Lead City University Campus',
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

            return res.status(200).json({
                success: true,
                message: 'Congratulations! Your expert account is now active and unlocked.',
                isActivated: true,
                walletBalance: user.walletBalance
            });
        }

        if (purpose === 'appointment_pay' && metadata.appointment_id) {
            // Settle appointment payment with 10% platform commission
            const appointment = await Appointment.findById(metadata.appointment_id).populate('service_id');
            if (appointment) {
                const commissionRate = 0.10;
                const commissionAmount = Math.round(amountPaidNaira * commissionRate);
                const expertPayout = amountPaidNaira - commissionAmount;

                appointment.paymentStatus = 'paid';
                appointment.amountPaid = amountPaidNaira;
                appointment.commissionRate = commissionRate;
                appointment.commissionAmount = commissionAmount;
                appointment.expertPayout = expertPayout;
                await appointment.save();

                // Record payment on user
                user.transactions.push({
                    type: 'payment',
                    amount: amountPaidNaira,
                    description: `Direct Paystack payment for ${appointment.service_id?.name || 'Appointment'}`,
                    reference_id: reference
                });
                await user.save();

                // Credit the expert (90% after 10% platform cut)
                let expertId = appointment.stylist_id || appointment.service_id?.stylist_id;
                if (expertId) {
                    const expert = await User.findById(expertId);
                    if (expert) {
                        expert.walletBalance = (expert.walletBalance || 0) + expertPayout;
                        expert.transactions.push({
                            type: 'earning',
                            amount: expertPayout,
                            description: `Earned from ${user.name} for ${appointment.service_id?.name || 'Service'} (₦${amountPaidNaira.toLocaleString()} - 10% D.WORLD fee ₦${commissionAmount.toLocaleString()})`,
                            reference_id: `EARN-${reference}`
                        });
                        await expert.save();

                        // Notify expert with confirmed booking & payment
                        await Notification.create({
                            user_id: expertId,
                            title: 'New Confirmed Booking! 📅',
                            message: `${user.name} booked "${appointment.service_id?.name || 'Service'}" for ${appointment.date} at ${appointment.time}. Payment confirmed (₦${expertPayout.toLocaleString()} added to your wallet)!`,
                            type: 'booking'
                        });

                        await Notification.create({
                            user_id: expertId,
                            title: 'Payment Received! 💰',
                            message: `You received ₦${expertPayout.toLocaleString()} (after 10% platform fee of ₦${commissionAmount.toLocaleString()}) from ${user.name} for "${appointment.service_id?.name || 'Service'}".`,
                            type: 'payment'
                        });
                    }
                }

                return res.status(200).json({
                    success: true,
                    message: `Payment of ₦${amountPaidNaira.toLocaleString()} confirmed (₦${expertPayout.toLocaleString()} disbursed to expert)!`,
                    walletBalance: user.walletBalance,
                    expertPayout,
                    commissionAmount
                });
            }
        }

        // Default purpose: Wallet Top-Up
        user.walletBalance = (user.walletBalance || 0) + amountPaidNaira;
        user.transactions.push({
            type: 'deposit',
            amount: amountPaidNaira,
            description: `Paystack Live Deposit (${data.channel || 'Card/Bank'})`,
            reference_id: reference
        });
        await user.save();

        // Create in-app notification for the user
        await Notification.create({
            user_id: user._id,
            title: 'Wallet Funded! 💳',
            message: `₦${amountPaidNaira.toLocaleString()} has been successfully deposited into your D.WORLD wallet via Paystack.`,
            type: 'payment'
        });

        res.status(200).json({
            success: true,
            message: `₦${amountPaidNaira.toLocaleString()} deposited into your wallet successfully!`,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Paystack Webhook Listener for real-time background confirmation
// @route   POST /api/payments/webhook
// @access  Public
const paystackWebhook = async (req, res) => {
    try {
        const secret = PAYSTACK_SECRET;
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

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
                    } else if (metadata.purpose === 'appointment_pay' && metadata.appointment_id) {
                        const appointment = await Appointment.findById(metadata.appointment_id).populate('service_id');
                        if (appointment && appointment.paymentStatus !== 'paid') {
                            const commissionRate = 0.10;
                            const commissionAmount = Math.round(amountPaidNaira * commissionRate);
                            const expertPayout = amountPaidNaira - commissionAmount;

                            appointment.paymentStatus = 'paid';
                            appointment.amountPaid = amountPaidNaira;
                            appointment.commissionRate = commissionRate;
                            appointment.commissionAmount = commissionAmount;
                            appointment.expertPayout = expertPayout;
                            await appointment.save();

                            user.transactions.push({
                                type: 'payment',
                                amount: amountPaidNaira,
                                description: `Paystack payment for ${appointment.service_id?.name || 'Appointment'}`,
                                reference_id: reference
                            });
                            await user.save();

                            let expertId = appointment.stylist_id || appointment.service_id?.stylist_id;
                            if (expertId) {
                                const expert = await User.findById(expertId);
                                if (expert) {
                                    expert.walletBalance = (expert.walletBalance || 0) + expertPayout;
                                    expert.transactions.push({
                                        type: 'earning',
                                        amount: expertPayout,
                                        description: `Earned from ${user.name} for ${appointment.service_id?.name || 'Service'} (₦${amountPaidNaira.toLocaleString()} - 10% D.WORLD fee ₦${commissionAmount.toLocaleString()})`,
                                        reference_id: `EARN-${reference}`
                                    });
                                    await expert.save();
                                }
                            }
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
    paystackWebhook
};
