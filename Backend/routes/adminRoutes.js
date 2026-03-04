// routes/adminRoutes.js

const express = require('express');
const router  = express.Router();

const {
  getOrders,
  verifyOrderHandler,
  getPendingImagesList,
  approveImage,
  rejectImage,
  getDashboard,
} = require('../controllers/adminController');

const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authenticate, requireAdmin);

// All admin routes
router.get('/dashboard', getDashboard);

router.get('/orders', getOrders);

router.patch('/orders/:id/verify', verifyOrderHandler);

router.get('/images/pending', getPendingImagesList);

router.put('/images/:id/approve', approveImage);

router.put('/images/:id/reject', rejectImage);

module.exports = router;