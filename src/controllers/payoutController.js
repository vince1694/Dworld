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

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const currentBalance = user.walletBalance || 0;
        if (currentBalance < numAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance (₦${currentBalance.toLocaleString()}). You cannot withdraw ₦${numAmount.toLocaleString()}.`
            });
        }

        const reference = `WD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        // Debit wallet immediately to prevent double-spending
        user.walletBalance -= numAmount;
        user.transactions.push({
            type: 'withdrawal',
            amount: numAmount,
            description: `Withdrawal request to ${bankName} (${accountNumber})`,
            reference_id: reference
        });

        // Save bank details for easy future 1-click withdrawals
        user.bankDetails = {
            bankName,
            bankCode,
            accountNumber,
            accountName
        };

        await user.save();

        const payout = await PayoutRequest.create({
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

        // If rejecting: refund funds back into specialist's wallet
        if (status === 'rejected') {
            if (payout.user_id) {
                const user = await User.findById(payout.user_id._id);
                if (user) {
                    user.walletBalance = (user.walletBalance || 0) + payout.amount;
                    user.transactions.push({
                        type: 'refund',
                        amount: payout.amount,
                        description: `Refund for rejected withdrawal: ${adminNotes || 'Request not approved'}`,
                        reference_id: `REJ-REF-${payout.reference}`
                    });
                    await user.save();

                    await createNotificationHelper(
                        user._id,
                        'Withdrawal Request Rejected ❌',
                        `Your payout of ₦${payout.amount.toLocaleString()} was rejected${adminNotes ? ` (${adminNotes})` : ''}. ₦${payout.amount.toLocaleString()} has been restored to your wallet balance.`,
                        'payment'
                    );
                }
            }
        } else if (status === 'completed') {
            if (payout.user_id) {
                await createNotificationHelper(
                    payout.user_id._id,
                    'Payout Disbursed! 💸',
                    `₦${payout.amount.toLocaleString()} has been sent to your ${payout.bankDetails.bankName} account (${payout.bankDetails.accountNumber})!`,
                    'payment'
                );
            }
        }

        payout.status = status;
        payout.adminNotes = adminNotes || payout.adminNotes;
        payout.processedBy = req.user.id;
        payout.processedAt = new Date();
        await payout.save();

        res.status(200).json({
            success: true,
            message: `Payout request marked as ${status}.`,
            data: payout
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
