const express = require('express');
const { 
  initiateRegister,
  verifyRegistration,
  login, 
  updateProfile, 
  uploadAvatar,
  updateAvailability,
  forgotPassword, 
  verifyOtp, 
  resetPassword, 
  getMe,
  getWallet,
  topupWallet,
  getExperts,
  getExpertById,
  addPortfolioItem,
  deletePortfolioItem,
  getAllUsersForAdmin,
  updateUserStatusForAdmin,
  deleteUserForAdmin
} = require('../controllers/authController');
const { body } = require('express-validator');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// Step 1: Submit form → sends OTP
router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], initiateRegister);

// Step 2: Verify OTP → creates account
router.post('/register/verify', verifyRegistration);

// Expert registration alias (same two-step flow)
router.post('/register-stylist', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], initiateRegister);

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/wallet', protect, getWallet);
router.post('/wallet/topup', protect, topupWallet);
router.get('/experts', getExperts);
router.get('/experts/:id', getExpertById);

router.post('/forgot-password', forgotPassword);
router.post('/verify', verifyOtp);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, uploadAvatar);
router.put('/availability', protect, updateAvailability);
router.post('/portfolio', protect, addPortfolioItem);
router.delete('/portfolio/:itemId', protect, deletePortfolioItem);

// Admin User Operations
router.get('/admin/users', protect, adminOnly, getAllUsersForAdmin);
router.patch('/admin/users/:id/status', protect, adminOnly, updateUserStatusForAdmin);
router.delete('/admin/users/:id', protect, adminOnly, deleteUserForAdmin);

module.exports = router;
