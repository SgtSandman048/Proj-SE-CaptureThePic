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
  listUsers,
  getUserDetail,
  getUserActivityHandler,
  banUserHandler,
  unbanUserHandler,
  deleteUserHandler,
  listWithdrawals,
  processWithdrawalHandler,
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

router.get('/users', listUsers);

router.get('/users/:id', getUserDetail);

router.get('/users/:id/activity', getUserActivityHandler);

router.patch('/users/:id/ban', banUserHandler);

router.patch('/users/:id/unban', unbanUserHandler);

router.delete('/users/:id', deleteUserHandler);

router.get('/withdrawals', listWithdrawals);

router.patch('/withdrawals/:id/process', processWithdrawalHandler);

module.exports = router;