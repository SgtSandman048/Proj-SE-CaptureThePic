// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const authRoutes = require('./routes/authRoutes');
const { sendError } = require('./utils/apiResponse');
//const imageRoutes = require('./routes/imageRoutes');
const orderRoutes = require('./routes/orderRoutes');
//const adminRoutes = require('./routes/adminRoutes');

const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base Route
app.get('/', (req, res) => {
  res.send('Photo Market Backend API is running...');
});


// Routes Call
app.use('/api/auth', authRoutes);
//app.use('/api/images', imageRoutes);
app.use('/api/orders', orderRoutes);
//app.use('/api/admin', adminRoutes);

// Error Handler
app.use((req, res) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`[!] Server is running on http://localhost:${PORT}`);
});
