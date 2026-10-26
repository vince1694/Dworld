const https = require('https');
const User = require('../models/User');
const PayoutRequest = require('../models/PayoutRequest');
const { createNotificationHelper } = require('./notificationController');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';

// Fallback top Nigerian banks in case Paystack API is unreachable
const FALLBACK_NIGERIAN_BANKS = [
    { name: 'Access Bank', code: '044' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
    { name: 'United Bank for Africa (UBA)', code: '033' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'Kuda Bank', code: '50211' },
    { name: 'OPay Digital Services', code: '999992' },
    { name: 'Palmpay', code: '999991' },
    { name: 'Moniepoint MFB', code: '50515' },
    { name: 'Stanbic IBTC Bank', code: '221' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'FCMB', code: '214' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'Union Bank of Nigeria', code: '032' },
    { name: 'Wema Bank (ALAT)', code: '035' },
    { name: 'Polaris Bank', code: '076' }
];

let cachedBanks = null;
let lastBanksFetch = 0;

const paystackGet = (endpoint) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: endpoint,
            method: 'GET',
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
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse Paystack response: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

// @desc    Get list of supported Nigerian commercial & fintech banks
// @route   GET /api/payouts/banks
// @access  Public / Authenticated
const getBankList = async (req, res, next) => {
    try {
        const now = Date.now();
        if (cachedBanks && (now - lastBanksFetch < 24 * 60 * 60 * 1000)) {
            return res.status(200).json({ success: true, data: cachedBanks });
        }

        try {
            const response = await paystackGet('/bank?country=nigeria&perPage=100');
            if (response.status && Array.isArray(response.data) && response.data.length > 0) {
                cachedBanks = response.data.map(b => ({
                    id: b.id,
                    name: b.name,
                    code: b.code,
                    slug: b.slug
                })).sort((a, b) => a.name.localeCompare(b.name));
                lastBanksFetch = now;
                return res.status(200).json({ success: true, data: cachedBanks });
            }
        } catch (apiErr) {
            console.warn('Paystack bank list API fetch notice:', apiErr.message);
        }

        // Return fallback list
        return res.status(200).json({ success: true, data: FALLBACK_NIGERIAN_BANKS });
    } catch (error) {
        next(error);
    }
};

// @desc    Resolve & verify Nigerian bank account holder name via Paystack
// @route   POST /api/payouts/resolve-account
// @access  Private (Experts / Authenticated)
const resolveBankAccount = async (req, res, next) => {
    try {
        const { account_number, bank_code } = req.body;

        if (!account_number || !bank_code) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both an account number and a bank code.'
            });
        }

        const cleanAcc = String(account_number).trim();
        const cleanCode = String(bank_code).trim();

        if (cleanAcc.length !== 10) {
            return res.status(400).json({
                success: false,
                message: 'Nigerian NUBAN account numbers must be exactly 10 digits.'
            });
        }

        try {
            const response = await paystackGet(`/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(cleanCode)}`);
            if (response.status && response.data) {
                return res.status(200).json({
                    success: true,
                    data: {
                        account_name: response.data.account_name,
                        account_number: response.data.account_number,
                        bank_id: response.data.bank_id
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: response.message || 'Could not verify bank account with the provided details.'
                });
            }
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Account verification error. Please confirm your 10-digit account number and selected bank.'
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Submit a new bank withdrawal / payout request
// @route   POST /api/payouts/request
// @access  Private (Experts)
const requestPayout = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount, bankName, bankCode, accountNumber, accountName } = req.body;

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount < 1000) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal amount is ₦1,000.'
            });
        }

        if (!bankName || !bankCode || !accountNumber || !accountName) {
            return res.status(400).json({
                success: false,
                message: 'Complete bank details (Bank, Account Number, and Verified Name) are required.'
            });
        }

        const reference = `WD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        // Atomic debit with balance guarantee to prevent race conditions & double-spending
        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                walletBalance: { $gte: numAmount }
            },
            {
                $inc: { walletBalance: -numAmount },
                $set: {
                    bankDetails: {
                        bankName,
                        bankCode,
                        accountNumber,
                        accountName
                    }
                },
                $push: {
                    transactions: {
                        type: 'withdrawal',
                        amount: numAmount,
                        description: `Withdrawal request to ${bankName} (${accountNumber})`,
                        reference_id: reference,
                        date: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!user) {
            const userCheck = await User.findById(userId);
            if (!userCheck) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
            const currentBalance = userCheck.walletBalance || 0;
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance (₦${currentBalance.toLocaleString()}). You cannot withdraw ₦${numAmount.toLocaleString()}.`
            });
        }

        let payout;
        try {
            payout = await PayoutRequest.create({
                user_id: user._id,
                amount: numAmount,
                fee: 0,
                netAmount: numAmount,
                bankDetails: {
                    bankName,
                    bankCode,
                    accountNumber,
                    accountName
                },
                status: 'pending',
                reference
            });
        } catch (createErr) {
            // Roll back wallet debit if PayoutRequest document fails to persist
            await User.findByIdAndUpdate(user._id, {
                $inc: { walletBalance: numAmount },
                $pull: { transactions: { reference_id: reference } }
            });
            throw createErr;
        }

        // Notify specialist
        await createNotificationHelper(
            user._id,
            'Withdrawal Submitted ⏳',
            `Your withdrawal request of ₦${numAmount.toLocaleString()} to ${bankName} has been received and is queued for processing.`,
            'payment'
        );

        res.status(201).json({
            success: true,
            message: `Withdrawal request for ₦${numAmount.toLocaleString()} submitted successfully!`,
            data: payout,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's own payout history
// @route   GET /api/payouts/my-payouts
// @access  Private
const getMyPayouts = async (req, res, next) => {
    try {
        const payouts = await PayoutRequest.find({ user_id: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: payouts
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all payout requests for admin dashboard
// @route   GET /api/payouts/admin/all
// @access  Private (Admin)
const getAllPayoutsForAdmin = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        const payouts = await PayoutRequest.find(filter)
            .populate('user_id', 'name email phone specialty matricNo avatar walletBalance')
            .sort({ createdAt: -1 })
            .lean();

        const totalPending = await PayoutRequest.countDocuments({ status: 'pending' });
        const totalCompleted = await PayoutRequest.countDocuments({ status: 'completed' });

        res.status(200).json({
            success: true,
            data: payouts,
            summary: {
                totalPending,
                totalCompleted
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin approve, mark completed/paid, or reject payout
// @route   PATCH /api/payouts/admin/:id/status
// @access  Private (Admin)
const updatePayoutStatusForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const allowed = ['approved', 'completed', 'rejected'];
        if (!status || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${allowed.join(', ')}`
            });
        }

        const payout = await PayoutRequest.findById(id).populate('user_id');
        if (!payout) {
            return res.status(404).json({ success: false, message: 'Payout request not found.' });
        }

        if (payout.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This payout has already been marked as completed.'
            });
        }

        if (payout.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'This payout request has already been rejected and refunded.'
            });
        }

        // Atomic transition: only match if still in an unprocessed status (pending or approved)
        // This guarantees that concurrent multi-clicks never process more than once!
        const validPreviousStatuses = ['pending', 'approved'];
        const updatedPayout = await PayoutRequest.findOneAndUpdate(
            { _id: id, status: { $in: validPreviousStatuses } },
            {
                $set: {
                    status,
                    adminNotes: adminNotes || payout.adminNotes,
                    processedBy: req.user.id,
                    processedAt: new Date()
                }
            },
            { new: true }
        ).populate('user_id');

        if (!updatedPayout) {
            return res.status(409).json({
                success: false,
                message: 'This payout request is currently being processed or has already been updated.'
            });
        }

        // If rejecting: refund funds back into specialist's wallet with idempotent guarantee
        if (status === 'rejected') {
            const targetUserId = updatedPayout.user_id?._id || updatedPayout.user_id;
            if (targetUserId) {
                const refundRef = `REJ-REF-${updatedPayout.reference}`;
                const refundAmount = Number(updatedPayout.amount);
                
                // Idempotent atomic update: only increment balance and record refund if this ref does not exist yet!
                const user = await User.findOneAndUpdate(
                    {
                        _id: targetUserId,
                        'transactions.reference_id': { $ne: refundRef }
                    },
                    {
                        $inc: { walletBalance: refundAmount },
                        $push: {
                            transactions: {
                                type: 'refund',
                                amount: refundAmount,
                                description: `Refund for rejected withdrawal: ${adminNotes || 'Request not approved'}`,
                                reference_id: refundRef,
                                date: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                if (user) {
                    await createNotificationHelper(
                        user._id,
                        'Withdrawal Request Rejected ❌',
                        `Your payout of ₦${refundAmount.toLocaleString()} was rejected${adminNotes ? ` (${adminNotes})` : ''}. ₦${refundAmount.toLocaleString()} has been restored to your wallet balance.`,
                        'payment'
                    );
                }
            }
        } else if (status === 'completed') {
            const targetUserId = updatedPayout.user_id?._id || updatedPayout.user_id;
            if (targetUserId) {
                await createNotificationHelper(
                    targetUserId,
                    'Payout Disbursed! 💸',
                    `₦${updatedPayout.amount.toLocaleString()} has been sent to your ${updatedPayout.bankDetails?.bankName || 'bank'} account (${updatedPayout.bankDetails?.accountNumber || ''})!`,
                    'payment'
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Payout request marked as ${status}.`,
            data: updatedPayout
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBankList,
    resolveBankAccount,
    requestPayout,
    getMyPayouts,
    getAllPayoutsForAdmin,
    updatePayoutStatusForAdmin
};
