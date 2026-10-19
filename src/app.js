const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();
const connectDB = require('./config/db');

// Connect to database
connectDB();

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Gzip compress all responses (saves 60-80% bandwidth) ─────────────────────
app.use(compression());

// Global Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://js.paystack.co"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            "img-src": ["'self'", "data:", "https:"],
            "frame-src": ["'self'", "https://checkout.paystack.com", "https://api.paystack.co"],
            "connect-src": ["'self'", "https:", "http:", "https://api.paystack.co", "https://checkout.paystack.com"]
        }
    }
}));

// Only log requests in development (morgan adds overhead per request)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Robust origin validation supporting production domains, LAN IPs, localhost on any port, and Render preview URLs
const ALLOWED_ORIGINS = [
    'https://dworld.ink',
    'https://www.dworld.ink',
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
].filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true; // Mobile apps, curl, same-origin, server-to-server
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // Allow any localhost / 127.0.0.1 on any port for local dev
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    // Allow local LAN IP for mobile phone testing (e.g. http://192.168.x.x:5173)
    if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
    // Allow any onrender.com deployment or dworld domain
    if (/^https:\/\/([a-z0-9-]+\.)?onrender\.com$/.test(origin)) return true;
    if (/^https:\/\/([a-z0-9-]+\.)?dworld\.ink$/.test(origin)) return true;
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked Origin]: ${origin}`);
            callback(new Error(`CORS policy: origin ${origin} not allowed`));
        }
    },
    credentials: true
}));
// Cloudinary avatar uploads use base64 — keep 10mb for /auth/avatar only, 2mb elsewhere
app.use('/api/auth/avatar', express.json({ limit: '10mb' }));
app.use('/api/auth/portfolio', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
const path = require('path');


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Serve frontend static build
const distPath = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    app.get('*path', (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ success: false, message: 'API route not found' });
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send('D.WORLD Backend API Running. Please build the client using npm run build.'));
}

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const { startReminderScheduler } = require('./utils/reminderScheduler');

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    startReminderScheduler();
});

