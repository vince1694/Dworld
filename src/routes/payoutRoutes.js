const express = require('express');
const router = express.Router();
const {
    getBankList,
    resolveBankAccount,
    requestPayout,
    getMyPayouts,
    getAllPayoutsForAdmin,
    updatePayoutStatusForAdmin
} = require('../controllers/payoutController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public / Expert: Bank list & Account Name Resolution
router.get('/banks', getBankList);
router.post('/resolve-account', protect, resolveBankAccount);

// Expert: Request payout & check history
router.post('/request', protect, requestPayout);
router.get('/my-payouts', protect, getMyPayouts);

// Admin: Manage all specialist payouts
router.get('/admin/all', protect, adminOnly, getAllPayoutsForAdmin);
router.patch('/admin/:id/status', protect, adminOnly, updatePayoutStatusForAdmin);

module.exports = router;
