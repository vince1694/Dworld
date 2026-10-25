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
const fs = require('fs');
const path = require('path');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Gzip compress all responses (saves 60-80% bandwidth) ─────────────────────
app.use(compression());

// Global Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://js.paystack.co", "https://*.paystack.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://paystack.com", "https://*.paystack.com"],
            "style-src-elem": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://paystack.com", "https://*.paystack.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://paystack.com", "https://*.paystack.com", "data:"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "frame-src": ["'self'", "https://checkout.paystack.com", "https://api.paystack.co", "https://*.paystack.com"],
            "connect-src": ["'self'", "https:", "http:", "wss:", "https://api.paystack.co", "https://checkout.paystack.com", "https://*.paystack.com"]
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
app.use(express.json({ 
    limit: '2mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));

// Serve SEO and Crawler files directly with correct MIME types
app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const distFile = path.resolve(__dirname, '../client/dist/robots.txt');
    const pubFile = path.resolve(__dirname, '../client/public/robots.txt');
    if (fs.existsSync(distFile)) return res.sendFile(distFile);
    if (fs.existsSync(pubFile)) return res.sendFile(pubFile);
    res.send(`# Robots.txt for D.World (https://dworld.ink)
User-agent: *
Allow: /
Allow: /services
Allow: /login
Allow: /register
Allow: /forgot-password
Allow: /contact

# Disallow private user & administrative panels from crawling
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /wallet
Disallow: /wallet/
Disallow: /chat
Disallow: /chat/
Disallow: /book
Disallow: /book/
Disallow: /appointment/
Disallow: /appointments/
Disallow: /api/

# Sitemap location
Sitemap: https://dworld.ink/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const distFile = path.resolve(__dirname, '../client/dist/sitemap.xml');
    const pubFile = path.resolve(__dirname, '../client/public/sitemap.xml');
    if (fs.existsSync(distFile)) return res.sendFile(distFile);
    if (fs.existsSync(pubFile)) return res.sendFile(pubFile);
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dworld.ink/</loc>
    <lastmod>2026-10-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://dworld.ink/services</loc>
    <lastmod>2026-10-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dworld.ink/register</loc>
    <lastmod>2026-10-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://dworld.ink/login</loc>
    <lastmod>2026-10-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://dworld.ink/forgot-password</loc>
    <lastmod>2026-10-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
});

// Serve frontend static build with production-grade caching
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
    // Fingerprinted static assets (JS, CSS) — cache permanently for 1 year
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true
    }));

    // Other static files (images, icons, manifest)
    app.use(express.static(distPath, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));

    app.get('*path', (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ success: false, message: 'API route not found' });
        }
        res.setHeader('Cache-Control', 'no-cache');
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

