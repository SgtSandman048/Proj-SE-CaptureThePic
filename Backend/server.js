// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const walletRoutes = require('./routes/walletRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { sendError } = require('./utils/apiResponse');

const PORT = process.env.PORT || 8080;

// FIX: Read allowed origin from env var so it works both locally and on Railway.
// Set CORS_ORIGIN=https://your-frontend.up.railway.app in Railway environment variables.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5174')
  .split(',')
  .map(o => o.trim());

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base Route
app.get('/', (req, res) => {
  res.send('Photo Market Backend API is running...');
});

// Routes Call
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handler
app.use((req, res) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`[!] Server is running on http://localhost:${PORT}`);
  console.log(`[!] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});