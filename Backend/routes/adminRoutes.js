/**
 * routes/adminRoutes.js
 */
const express = require('express');
const router = express.Router();

const {
  getDashboard,
  listUsers,
  setUserStatus,
  setUserRole,
  getPendingImagesList,
  approveImage,
  rejectImage,
  getPendingOrdersList,
  verifyOrder,
} = require('../controllers/adminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// All admin routes require Admin role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// Users
router.get('/users', listUsers);
router.put('/users/:id/status', setUserStatus);
router.put('/users/:id/role', setUserRole);

// Images moderation
router.get('/images/pending', getPendingImagesList);
router.put('/images/:id/approve', approveImage);
router.put('/images/:id/reject', rejectImage);

// Orders / slip verification
router.get('/orders/pending', getPendingOrdersList);
router.put('/orders/:id/verify', verifyOrder);

module.exports = router;