const express = require('express');
const { 
  register, 
  login, 
  updateProfile, 
  forgotPassword, 
  verifyOtp, 
  resetPassword, 
  getMe,
  getWallet,
  topupWallet,
  getExperts 
} = require('../controllers/authController');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], register);

router.post('/register-stylist', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], register);

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/wallet', protect, getWallet);
router.post('/wallet/topup', protect, topupWallet);
router.get('/experts', getExperts);

router.post('/forgot-password', forgotPassword);
router.post('/verify', verifyOtp);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
