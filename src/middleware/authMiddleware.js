const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            try {
                const dbUser = await User.findById(decoded.id).select('-password');
                if (dbUser) {
                    req.user = dbUser;
                } else {
                    req.user = decoded;
                }
            } catch (dbErr) {
                req.user = decoded;
            }
            return next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const adminOnly = (req, res, next) => {
    const allowedRoles = ['admin', 'stylist', 'expert'];
    if (req.user && allowedRoles.includes(req.user.role)) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Access denied. Admin or Stylist role required.' });
    }
};

module.exports = { protect, adminOnly };
