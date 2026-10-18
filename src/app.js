const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const connectDB = require('./config/db');

// Connect to database
connectDB();

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

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
})); // Security headers with relaxed CSP for CDNs & Paystack
app.use(morgan('dev')); // Request logging
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
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

