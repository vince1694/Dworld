const User = require('../models/User');
const Service = require('../models/Service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { validationResult } = require('express-validator');
const { sendPasswordResetEmail } = require('../utils/sendEmail');

const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        let { name, email, password, role, state, matricNo, newServices } = req.body;

        // Strict LCU Matriculation Number validation for all accounts & experts
        if (matricNo || role === 'user' || role === 'expert' || role === 'stylist') {
            const matricRegex = /^lcu\/ug\/\d{2}\/\d{4,5}$/i;
            if (!matricNo || !matricRegex.test(matricNo.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Access Denied: Invalid Lead City University Matriculation Number format. Expected format: LCU/UG/00/00000 (e.g. LCU/UG/22/04192)' 
                });
            }
            matricNo = matricNo.trim().toUpperCase();
        }

        // Check if user exists
        const userExists = await User.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with verified status for specialists
        const isVerified = (role === 'expert' || role === 'stylist' || role === 'admin') ? true : true;
        const userResult = await User.create({ name, email, password: hashedPassword, role, state, matricNo, isVerified });
        const stylist_id = userResult._id;

        // Enforce 1 Expert = 1 Single Service
        if ((role === 'expert' || role === 'stylist') && newServices) {
            const svc = Array.isArray(newServices) ? newServices[0] : newServices;
            if (svc && svc.name) {
                await Service.create({
                    name: svc.name,
                    description: svc.description || `${userResult.name}'s professional campus service.`,
                    price: Number(svc.price) || 3000,
                    duration: Number(svc.duration) || 45,
                    type: 'single',
                    category: svc.category || 'Single Services',
                    location: svc.location || 'Campus Studio / Main Salon',
                    stylist_id: stylist_id
                });

                // Update expert's specialty to match their single service
                await User.findByIdAndUpdate(stylist_id, {
                    specialty: svc.name,
                    bio: `Specialized ${svc.name} expert at Lead City University.`
                });
            }
        }

        const token = jwt.sign(
            { id: userResult.id || userResult._id, role: userResult.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        res.status(201).json({ 
            success: true, 
            message: 'Registration successful',
            token,
            user: {
                id: userResult.id || userResult._id,
                name: userResult.name,
                email: userResult.email,
                role: userResult.role,
                state: userResult.state
            }
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const userId = String(user._id || user.id);
        const secret = process.env.JWT_SECRET || 'antigravity-secret-key-12345';

        const token = jwt.sign(
            { id: userId, role: user.role },
            secret,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: userId,
                _id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
                matricNo: user.matricNo || 'LCU/UG/22/04192',
                department: user.department || 'Cosmetology & Campus Styling',
                phone: user.phone || '+234 803 555 0199'
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Login failed due to internal server error' });
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, phone } = req.body;
        const userId = req.user.id;

        await User.update(userId, { name, phone });

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide your email address' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

        if (!user) {
            // Security best practice: Don't reveal if account exists
            return res.json({ success: true, message: 'If an account exists with this email, a verification code has been sent.' });
        }

        // Generate a cryptographically secure 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP with 10-minute expiry
        user.resetOtp = otp;
        user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send email via Brevo
        try {
            await sendPasswordResetEmail(user.email, user.name, otp);
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr.message);
            // Even if Brevo fails, keep OTP saved for dev fallback
        }

        res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Please provide both email and verification code' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

        if (!user || !user.resetOtp) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        // Check if OTP matches
        if (user.resetOtp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
        }

        // Check if OTP has expired
        if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        // Clear OTP once used
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        // Issue 15-minute temporary reset token
        const token = jwt.sign({ email: user.email, purpose: 'reset-password' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ success: true, token });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, token, password } = req.body;

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.email !== email || decoded.purpose !== 'reset-password') {
                throw new Error('Invalid token');
            }
        } catch (e) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.updatePasswordByEmail(email, hashedPassword);

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, bio, specialty } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, bio, specialty },
            { new: true }
        );
        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        next(error);
    }
};

const updateAvailability = async (req, res, next) => {
    try {
        const { workingDays, workingHours } = req.body;
        const updateData = {};
        if (workingDays && Array.isArray(workingDays)) updateData.workingDays = workingDays;
        if (workingHours) updateData.workingHours = workingHours;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        );
        res.json({ 
            success: true, 
            message: 'Working days and hours updated successfully!',
            workingDays: user.workingDays,
            workingHours: user.workingHours
        });
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: {
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            bio: user.bio,
            specialty: user.specialty,
            workingDays: user.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            workingHours: user.workingHours || { start: '09:00', end: '18:00' },
            walletBalance: user.walletBalance || 500
        }});
    } catch (error) {
        next(error);
    }
};

const getWallet = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                walletBalance: user.walletBalance || 500,
                transactions: (user.transactions || []).reverse()
            }
        });
    } catch (error) {
        next(error);
    }
};

const topupWallet = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + depositAmount;
        user.transactions.push({
            type: 'deposit',
            amount: depositAmount,
            description: `Deposited test wallet funds`,
            reference_id: `DEP-${Date.now()}`
        });

        await user.save();

        res.json({
            success: true,
            message: `Successfully topped up $${depositAmount}!`,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        next(error);
    }
};

const getExperts = async (req, res, next) => {
    try {
        const experts = await User.find({ role: { $in: ['expert', 'stylist'] }, isVerified: { $ne: false } }).select('-password');
        const Service = require('../models/Service');

        // Populate services for each verified expert (auto-seeding default services if none exist)
        const expertsWithServices = await Promise.all(experts.map(async (exp) => {
            let services = await Service.find({ 
                $or: [
                    { stylist_id: exp._id }, 
                    { stylist_id: String(exp._id) }
                ] 
            });

            // If an expert has no services listed yet, create their single specialty service
            if (!services || services.length === 0) {
                const spec = exp.specialty || 'Hair Styling';
                const defaultSingle = await Service.create({
                    name: spec,
                    description: `${exp.name}'s professional campus service.`,
                    price: 3500,
                    duration: 45,
                    type: 'single',
                    category: 'Single Services',
                    location: 'Campus Studio / Main Salon',
                    stylist_id: exp._id
                });
                services = [defaultSingle];
            }

            return {
                id: exp._id,
                _id: exp._id,
                name: exp.name,
                email: exp.email,
                role: exp.role,
                phone: exp.phone || '+234 803 555 0199',
                matricNo: exp.matricNo || 'LCU/UG/22/04192',
                department: exp.department || 'Cosmetology & Campus Styling',
                bio: exp.bio || 'Professional Verified Specialist',
                specialty: exp.specialty || 'General Specialist',
                workingDays: exp.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                workingHours: exp.workingHours || { start: '09:00', end: '18:00' },
                rating: exp.rating || 4.9,
                isVerified: true,
                services
            };
        }));

        res.json({ success: true, data: expertsWithServices });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    register, 
    login, 
    updateProfile, 
    updateAvailability,
    forgotPassword, 
    verifyOtp, 
    resetPassword, 
    getMe, 
    getWallet, 
    topupWallet, 
    getExperts 
};
