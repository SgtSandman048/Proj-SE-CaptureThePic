const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const apiRoutes = require('./routes/apiRoutes');

// Middleware
app.use(cors());
app.use(express.json()); // อ่าน JSON body
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('Photo Market Backend API is running...');
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});