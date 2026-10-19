const User = require('../models/User');
const Service = require('../models/Service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { sendPasswordResetEmail, sendRegistrationOtpEmail, sendWelcomeEmail } = require('../utils/sendEmail');
const { uploadImage } = require('../utils/cloudinary');

// ── In-memory pending registrations store (TTL: 10 min) ──────────────────────
const pendingRegistrations = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of pendingRegistrations.entries()) {
        if (now - val.createdAt > PENDING_TTL_MS) pendingRegistrations.delete(key);
    }
}, 60 * 1000);

// ── Step 1: Collect registration data, send email OTP ────────────────────────
const initiateRegister = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        let { name, email, password, role, state, matricNo, newServices, address, location } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanRole = (role === 'stylist' || role === 'expert') ? 'expert' : 'user';

        // Experts must provide their location address so customers can find nearby experts
        const expertAddress = (address || location || '').trim();
        if (cleanRole === 'expert' && !expertAddress) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide your campus/hostel location address so students can find you nearby.' 
            });
        }

        // Validate LCU matric format
        if (matricNo || cleanRole === 'user' || cleanRole === 'expert') {
            const matricRegex = /^lcu\/ug\/\d{2}\/\d{4,5}$/i;
            if (!matricNo || !matricRegex.test(matricNo.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Access Denied: Invalid Lead City University Matriculation Number format. Expected format: LCU/UG/00/00000 (e.g. LCU/UG/22/04192)' 
                });
            }
            matricNo = matricNo.trim().toUpperCase();
        }

        // Check if email already exists
        const userExists = await User.findOne({ email: cleanEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Hash password now so we don't store plaintext
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Cache pending registration (keyed by email)
        pendingRegistrations.set(cleanEmail, {
            name: (name || '').trim(),
            email: cleanEmail,
            password: hashedPassword,
            role: cleanRole,
            state: state || '',
            address: expertAddress,
            location: expertAddress || 'Lead City University Campus',
            matricNo,
            newServices,
            otp,
            createdAt: Date.now()
        });

        // Send OTP email exclusively via Gmail (no OTP leaks in logs/response)
        try {
            await sendRegistrationOtpEmail(cleanEmail, name, otp);
        } catch (emailErr) {
            console.error('[REGISTRATION EMAIL FAILED]:', `Code: ${emailErr.code || 'N/A'} | Error: ${emailErr.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to deliver verification code to your email. Please ensure your email is correct and try again.'
            });
        }

        res.status(200).json({
            success: true,
            emailDelivered: true,
            message: 'Verification code sent to your email. Please check your inbox.',
            email: cleanEmail
        });
    } catch (error) {
        next(error);
    }
};

// ── Step 2: Verify OTP and create account ────────────────────────────────────
const verifyRegistration = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const pending = pendingRegistrations.get(cleanEmail);

        if (!pending) {
            return res.status(400).json({ success: false, message: 'No pending registration found. Please start over.' });
        }

        // Check TTL
        if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
            pendingRegistrations.delete(cleanEmail);
            return res.status(400).json({ success: false, message: 'Verification code expired. Please register again.' });
        }

        // Check OTP
        if (pending.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
        }

        // Remove from pending store
        pendingRegistrations.delete(cleanEmail);

        const { name, password: hashedPassword, role, state, matricNo, newServices, address, location } = pending;
        const validRole = (role === 'stylist' || role === 'expert') ? 'expert' : 'user';

        // Create verified account
        const isExpert = validRole === 'expert';
        const isActivated = !isExpert; // Users are instantly activated; experts activate with ₦3,000 fee
        const userResult = await User.create({ 
            name, 
            email: cleanEmail, 
            password: hashedPassword, 
            role: validRole, 
            state, 
            address: address || '',
            location: location || address || 'Lead City University Campus',
            matricNo, 
            isVerified: true,
            isActivated,
            activationFee: 3000 
        });
        const stylist_id = userResult._id;

        // Create single service for experts
        if (isExpert && newServices) {
            const svc = Array.isArray(newServices) ? newServices[0] : newServices;
            if (svc && svc.name) {
                await Service.create({
                    name: svc.name,
                    description: svc.description || `${userResult.name}'s professional campus service.`,
                    price: Number(svc.price) || 3000,
                    duration: Number(svc.duration) || 45,
                    type: 'single',
                    category: svc.category || 'Single Services',
                    location: address || location || svc.location || 'Lead City University Campus',
                    stylist_id
                });
                await User.findByIdAndUpdate(stylist_id, {
                    specialty: svc.name,
                    bio: `Specialized ${svc.name} expert at ${address || 'Lead City University Campus'}.`
                });
            }
        }

        // Send Welcome Email & in-app onboarding notification
        sendWelcomeEmail(cleanEmail, userResult.name, validRole).catch(emailErr => {
            console.warn('[WELCOME EMAIL NOTICE]:', emailErr.message);
        });

        Notification.create({
            user_id: userResult._id,
            title: isExpert ? 'Welcome to the D.WORLD Expert Network!' : 'Welcome to D.WORLD!',
            message: isExpert
                ? 'Welcome aboard! Activate your expert profile for ₦3,000 to start receiving student bookings.'
                : 'Welcome to D.WORLD LCU! Browse top campus stylists, fund your student wallet, and book appointments in seconds.',
            type: 'system'
        }).catch(notifErr => console.warn('[WELCOME NOTIFICATION NOTICE]:', notifErr.message));

        const token = jwt.sign(
            { id: userResult.id || userResult._id, role: userResult.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
        );

        res.status(201).json({ 
            success: true, 
            message: 'Account verified and created successfully! Welcome to D.World 🎉',
            token,
            user: {
                id: userResult.id || userResult._id,
                name: userResult.name,
                email: userResult.email,
                role: userResult.role,
                state: userResult.state,
                isActivated: userResult.isActivated,
                avatar: userResult.avatar || ''
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

        const cleanEmail = (email || '').trim().toLowerCase();
        // 1. Direct indexed exact lookup (fastest, utilizes unique index on email)
        let user = await User.findOne({ email: cleanEmail });
        if (!user) {
            // 2. Safe escaped regex fallback for case-insensitive edge cases
            const escaped = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            user = await User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const userId = String(user._id || user.id);
        // Fix #10: Never fall back to a hardcoded secret — throw if missing in production
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET environment variable is not configured.');

        // Fix #11: Standardise token lifetime — use env var (same as register flow)
        const token = jwt.sign(
            { id: userId, role: user.role },
            secret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
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
                isActivated: user.role === 'expert' ? Boolean(user.isActivated) : true,
                matricNo: user.matricNo || '',
                department: user.department || '',
                phone: user.phone || '',
                avatar: user.avatar || ''
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Login failed due to internal server error' });
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

        // Send email via Gmail
        try {
            await sendPasswordResetEmail(user.email, user.name, otp);
        } catch (emailErr) {
            console.error('[PASSWORD RESET EMAIL FAILED]:', emailErr.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification code. Please try again later.'
            });
        }

        res.json({ 
            success: true, 
            message: 'Verification code sent to your email.'
        });
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
        const { name, phone, bio, specialty, avatar, address, location } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (bio !== undefined) updateData.bio = bio;
        if (specialty !== undefined) updateData.specialty = specialty;
        if (address !== undefined) updateData.address = address;
        if (location !== undefined) updateData.location = location;

        if (avatar && typeof avatar === 'string' && avatar.trim()) {
            const avatarUrl = await uploadImage(avatar, 'dworld_avatars');
            updateData.avatar = avatarUrl;
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        ).select('-password');

        invalidateExpertsCache();

        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        next(error);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        const { avatar } = req.body;
        if (!avatar) {
            return res.status(400).json({ success: false, message: 'Please provide an image for the avatar.' });
        }

        const avatarUrl = await uploadImage(avatar, 'dworld_avatars');
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        invalidateExpertsCache();

        res.json({
            success: true,
            message: 'Profile picture updated successfully!',
            avatar: avatarUrl,
            user
        });
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
        // Fix #4: Always fetch fresh from DB — the JWT only contains { id, role },
        // so the req.user shortcut (checking req.user.name) never fires anyway.
        const userId = req.user?.id || req.user?._id;
        const user = await User.findById(userId).select('-password -resetOtp -resetOtpExpires');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: {
            id: String(user.id || user._id),
            _id: String(user.id || user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || '',
            isActivated: user.role === 'expert' ? Boolean(user.isActivated) : true,
            activationFee: user.activationFee || 3000,
            phone: user.phone || '',
            bio: user.bio || '',
            matricNo: user.matricNo || '',
            department: user.department || 'Cosmetology & Campus Styling',
            specialty: user.specialty || '',
            workingDays: user.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            workingHours: user.workingHours || { start: '09:00', end: '18:00' },
            portfolio: user.portfolio || [],
            walletBalance: Number(user.walletBalance || 0)
        }});
    } catch (error) {
        next(error);
    }
};

const getWallet = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const user = await User.findById(userId).select('walletBalance transactions');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                walletBalance: Number(user.walletBalance || 0),
                // Fix #8: .slice() before .reverse() prevents in-place mutation of the document array
                transactions: (user.transactions || []).slice().reverse()
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
            description: `Wallet top-up via Paystack`,
            reference_id: `DEP-${Date.now()}`
        });

        await user.save();

        res.json({
            success: true,
            message: `Wallet topped up successfully! ₦${depositAmount.toLocaleString()} added.`,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        next(error);
    }
};

// ── Simple in-memory cache for getExperts (60s TTL) ──────────────────────────
let _expertsCache = null;
let _expertsCacheTime = 0;
const EXPERTS_CACHE_TTL = 60 * 1000; // 60 seconds

const getExperts = async (req, res, next) => {
    try {
        const { location: locationQuery } = req.query;

        // Only use cache when there's no location filter (general listing)
        const useCache = !locationQuery;
        const now = Date.now();
        if (useCache && _expertsCache && (now - _expertsCacheTime) < EXPERTS_CACHE_TTL) {
            return res.json({ success: true, data: _expertsCache, cached: true });
        }

        let queryFilter = { 
            role: { $in: ['expert', 'stylist'] }, 
            isVerified: true, 
            isActivated: true 
        };

        if (locationQuery && locationQuery.trim()) {
            const locRegex = new RegExp(locationQuery.trim(), 'i');
            queryFilter.$or = [
                { address: locRegex },
                { location: locRegex },
                { state: locRegex }
            ];
        }

        // Select only needed fields — exclude heavy arrays like transactions, resetOtp
        const experts = await User.find(queryFilter).select(
            'name email role phone address location state matricNo department bio specialty ' +
            'workingDays workingHours rating avatar portfolio isVerified isActivated'
        ).lean();

        if (!experts || experts.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const Service = require('../models/Service');
        const expertIds = experts.map(e => e._id);

        // ── Single batched query for ALL experts' services ────────────────────
        const allServices = await Service.find({ stylist_id: { $in: expertIds } }).lean();

        // Group services by stylist_id string for O(1) lookup
        const servicesByExpert = {};
        for (const svc of allServices) {
            const key = String(svc.stylist_id);
            if (!servicesByExpert[key]) servicesByExpert[key] = [];
            servicesByExpert[key].push(svc);
        }

        // Identify experts who have no services registered yet
        const expertsWithoutServices = experts.filter(exp => !servicesByExpert[String(exp._id)] || servicesByExpert[String(exp._id)].length === 0);

        // Fix #9: Use per-expert upsert instead of insertMany to prevent duplicate
        // default services accumulating each time the 60s cache expires.
        if (expertsWithoutServices.length > 0) {
            const upsertOps = expertsWithoutServices.map(exp => ({
                updateOne: {
                    filter: { stylist_id: exp._id },
                    update: { $setOnInsert: {
                        name: exp.specialty || 'Barber',
                        description: `${exp.name}'s professional campus service.`,
                        price: 3500,
                        duration: 45,
                        type: 'single',
                        category: 'Single Services',
                        location: exp.address || exp.location || 'Lead City University Campus',
                        stylist_id: exp._id
                    }},
                    upsert: true
                }
            }));
            await Service.bulkWrite(upsertOps, { ordered: false }).catch(() => {});

            // Re-fetch newly created services for these experts
            const newSvcs = await Service.find({ stylist_id: { $in: expertsWithoutServices.map(e => e._id) } }).lean();
            for (const svc of newSvcs) {
                const key = String(svc.stylist_id);
                if (!servicesByExpert[key]) servicesByExpert[key] = [];
                if (!servicesByExpert[key].length) servicesByExpert[key].push(svc);
            }
        }

        const expertsWithServices = experts.map(exp => {
            const services = servicesByExpert[String(exp._id)] || [];
            return {
                id: exp._id,
                _id: exp._id,
                name: exp.name,
                email: exp.email,
                role: exp.role,
                phone: exp.phone || '',
                address: exp.address || exp.location || '',
                location: exp.location || exp.address || 'Lead City University Campus',
                matricNo: exp.matricNo || '',
                department: exp.department || 'Campus Styling Specialist',
                bio: exp.bio || 'Professional Verified Specialist',
                specialty: exp.specialty || 'General Specialist',
                workingDays: exp.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                workingHours: exp.workingHours || { start: '09:00', end: '18:00' },
                rating: exp.rating || 4.9,
                avatar: exp.avatar || '',
                portfolio: exp.portfolio || [],
                isVerified: true,
                services
            };
        });

        // Update cache
        if (useCache) {
            _expertsCache = expertsWithServices;
            _expertsCacheTime = now;
        }

        res.json({ success: true, data: expertsWithServices });
    } catch (error) {
        next(error);
    }
};

// Invalidate experts cache when an expert updates their profile
const invalidateExpertsCache = () => {
    _expertsCache = null;
    _expertsCacheTime = 0;
};


const addPortfolioItem = async (req, res, next) => {
    try {
        const { title, description, imageUrl, category } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Image is required for lookbook item.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Expert account not found.' });
        }

        if (user.portfolio && user.portfolio.length >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Your professional lookbook allows a maximum of 3 highlight pictures. Please remove an existing photo first to upload a new one.'
            });
        }

        const uploadedUrl = await uploadImage(imageUrl, 'dworld_portfolio');

        const newItem = {
            title: (title || '').trim(),
            description: (description || '').trim(),
            imageUrl: uploadedUrl,
            category: (category || user.specialty || 'Hair Styling').trim(),
            createdAt: new Date()
        };

        if (!user.portfolio) user.portfolio = [];
        user.portfolio.unshift(newItem);
        await user.save();
        invalidateExpertsCache();

        res.status(201).json({
            success: true,
            message: 'Lookbook style added successfully!',
            data: user.portfolio
        });
    } catch (error) {
        next(error);
    }
};

const deletePortfolioItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Expert account not found.' });
        }

        user.portfolio = (user.portfolio || []).filter(item => String(item._id) !== String(itemId));
        await user.save();
        invalidateExpertsCache();

        res.status(200).json({
            success: true,
            message: 'Lookbook item removed.',
            data: user.portfolio
        });
    } catch (error) {
        next(error);
    }
};

const updatePortfolioItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { title, description, imageUrl, category } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Expert account not found.' });
        }

        const item = (user.portfolio || []).find(it => String(it._id) === String(itemId));
        if (!item) {
            return res.status(404).json({ success: false, message: 'Lookbook photo not found.' });
        }

        if (title !== undefined) item.title = (title || '').trim();
        if (description !== undefined) item.description = (description || '').trim();
        if (category !== undefined) item.category = (category || user.specialty || 'General').trim();

        if (imageUrl && imageUrl.trim()) {
            if (imageUrl.startsWith('data:image')) {
                const uploadedUrl = await uploadImage(imageUrl, 'dworld_portfolio');
                item.imageUrl = uploadedUrl;
            } else {
                item.imageUrl = imageUrl.trim();
            }
        }

        await user.save();
        invalidateExpertsCache();

        res.status(200).json({
            success: true,
            message: 'Lookbook photo updated successfully!',
            data: user.portfolio
        });
    } catch (error) {
        next(error);
    }
};

const getExpertById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const expert = await User.findOne({
            _id: id,
            role: { $in: ['expert', 'stylist'] }
        }).select('-password -resetOtp -resetOtpExpires -transactions').lean();

        if (!expert) {
            return res.status(404).json({ success: false, message: 'Specialist profile not found.' });
        }

        let services = await Service.find({ stylist_id: expert._id }).lean();
        if (!services.length) {
            services = [{
                _id: 'default-' + expert._id,
                name: expert.specialty || 'General Specialist',
                description: `${expert.name}'s professional campus service.`,
                price: 3500,
                duration: 45,
                category: 'Single Services',
                location: expert.address || expert.location || 'Lead City University Campus',
                stylist_id: expert._id
            }];
        }

        res.json({
            success: true,
            data: {
                id: expert._id,
                _id: expert._id,
                name: expert.name,
                email: expert.email,
                phone: expert.phone || '',
                address: expert.address || expert.location || '',
                location: expert.location || expert.address || 'Lead City University Campus',
                matricNo: expert.matricNo || '',
                department: expert.department || 'Cosmetology & Campus Styling',
                bio: expert.bio || 'Verified campus specialist.',
                specialty: expert.specialty || 'General Specialist',
                rating: expert.rating || 5.0,
                avatar: expert.avatar || '',
                workingDays: expert.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                workingHours: expert.workingHours || { start: '09:00', end: '18:00' },
                portfolio: (expert.portfolio || []).slice(0, 3),
                isVerified: expert.isVerified !== false,
                isActivated: Boolean(expert.isActivated),
                services
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── Admin User Management ─────────────────────────────────────────────────────
const getAllUsersForAdmin = async (req, res, next) => {
    try {
        const { search, role, status } = req.query;
        let filter = {};

        if (role && role !== 'all') {
            filter.role = role;
        }

        if (status === 'activated') {
            filter.isActivated = true;
        } else if (status === 'unactivated') {
            filter.isActivated = false;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: regex },
                { email: regex },
                { phone: regex },
                { specialty: regex },
                { matricNo: regex },
                { location: regex }
            ];
        }

        const users = await User.find(filter)
            .select('-password -resetOtp -resetOtpExpires')
            .sort({ createdAt: -1 });

        // Stats summary
        const totalUsers = await User.countDocuments();
        const totalExperts = await User.countDocuments({ role: { $in: ['expert', 'stylist'] } });
        const activeExperts = await User.countDocuments({ role: { $in: ['expert', 'stylist'] }, isActivated: true });
        const totalStudents = await User.countDocuments({ role: 'user' });

        res.status(200).json({
            success: true,
            data: users,
            summary: {
                totalUsers,
                totalExperts,
                activeExperts,
                totalStudents
            }
        });
    } catch (error) {
        next(error);
    }
};

const updateUserStatusForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActivated, isVerified, role } = req.body;

        const updateData = {};
        if (typeof isActivated === 'boolean') {
            updateData.isActivated = isActivated;
            if (isActivated) {
                updateData.activatedAt = new Date();
            }
        }
        if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
        if (role) updateData.role = role;

        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true })
            .select('-password -resetOtp -resetOtpExpires');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'User status successfully updated.',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

const deleteUserForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (String(id) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        res.status(200).json({
            success: true,
            message: `User account (${user.email}) permanently deleted.`
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
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
    updatePortfolioItem,
    deletePortfolioItem,
    getAllUsersForAdmin,
    updateUserStatusForAdmin,
    deleteUserForAdmin
};

