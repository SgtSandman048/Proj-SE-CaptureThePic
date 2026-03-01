/**
 * routes/adminRoutes.js
 * ─────────────────────────────────────────────────────────
 * All routes require: authenticate + requireAdmin
 *
 *  GET   /api/admin/orders                 → list "checking" orders
 *  PATCH /api/admin/orders/:id/verify      → approve or reject
 *
 *  GET   /api/admin/images/pending         → image moderation queue
 *  PUT   /api/admin/images/:id/approve     → approve image
 *  PUT   /api/admin/images/:id/reject      → reject image
 *
 *  GET   /api/admin/dashboard              → platform stats
 *
 * ⚠️  Route order matters:
 *  /orders      must come BEFORE /orders/:id/verify
 *  /images/pending must come BEFORE /images/:id/...
 */
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

// ── All admin routes require valid JWT + admin role ────────────────────────
router.use(authenticate, requireAdmin);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);

// ════════════════════════════════════════════════════════════════════════════
//  Order Verification (core admin task)
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/orders
 * @desc    List all orders awaiting verification (status: "checking")
 *          Optional: ?all=true to see all statuses, ?status=completed to filter
 * @access  Admin only
 */
router.get('/orders', getOrders);

/**
 * @route   PATCH /api/admin/orders/:id/verify
 * @desc    Approve or reject a payment slip
 * @access  Admin only
 * @body    { "status": "completed" | "rejected", "note": "optional" }
 */
router.patch('/orders/:id/verify', verifyOrderHandler);

// ════════════════════════════════════════════════════════════════════════════
//  Image Moderation
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/admin/images/pending
 * @desc    List all images awaiting admin approval
 * @access  Admin only
 */
router.get('/images/pending', getPendingImagesList);

/**
 * @route   PUT /api/admin/images/:id/approve
 * @desc    Approve a pending image — makes it live and purchasable
 * @access  Admin only
 */
router.put('/images/:id/approve', approveImage);

/**
 * @route   PUT /api/admin/images/:id/reject
 * @desc    Reject a pending image with a reason
 * @access  Admin only
 * @body    { "reason": "string" }
 */
router.put('/images/:id/reject', rejectImage);

module.exports = router;