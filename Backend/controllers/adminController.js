// controllers/adminController.js
/* ─────────────────────────────────────────────────────────
 * Admin Operations — thin controller, all logic in adminService.
 *
 *  GET   /api/admin/orders          → getOrders      (list "checking" orders)
 *  PATCH /api/admin/orders/:id/verify → verifyOrder  (approve or reject)
 *
 * Also includes image moderation endpoints used by adminRoutes:
 *  GET  /api/admin/images/pending   → getPendingImages
 *  PUT  /api/admin/images/:id/approve
 *  PUT  /api/admin/images/:id/reject
 *  GET  /api/admin/dashboard
 */
const { db: getDb }   = require('../config/firebase');
const { getCheckingOrders, verifyOrder, getAllOrders } = require('../services/adminService');
const { getImageById, updateImage, getPendingImages } = require('../services/imageService');
const { IMAGE_STATUS } = require('../models/imageModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const db = getDb();

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/orders
//  Fetch all orders with status "checking" — awaiting admin verification
// ════════════════════════════════════════════════════════════════════════════
/**
 * Optional query params:
 *   ?status=checking|pending|completed|rejected  (default: "checking")
 *   ?all=true                                    (return all statuses)
 *
 * Response 200:
 * {
 *   "orders": [
 *     {
 *       "orderId": "id",
 *       "userId":  "id",
 *       "slipUrl": "url",
 *       "status":  "checking",
 *       "imageName": "...",
 *       "totalAmount": 374.5,
 *       "createdAt": "ISO",
 *       "updatedAt": "ISO"
 *     }
 *   ],
 *   "count": 1
 * }
 */
const getOrders = async (req, res) => {
  try {
    const { all, status } = req.query;

    let orders;

    if (all === 'true') {
      // Return ALL orders (any status) — useful for admin dashboard table
      orders = await getAllOrders({ statusFilter: null, limit: parseInt(req.query.limit) || 50 });
    } else if (status && status !== 'pending') {
      // Specific status filter from query param
      orders = await getAllOrders({ statusFilter: status, limit: parseInt(req.query.limit) || 50 });
    } else {
      // Default: return only "checking" orders (the primary admin task)
      orders = await getCheckingOrders();
    }

    // Shape response to match API spec
    const shaped = orders.map((o) => ({
      orderId:     o.orderId,
      userId:      o.userId,
      imageId:     o.imageId,
      imageName:   o.imageName,
      totalAmount: o.totalAmount,
      slipUrl:     o.slipUrl,
      status:      o.status,
      createdAt:   o.createdAt,
      updatedAt:   o.updatedAt,
      adminNote:   o.adminNote   || null,
      verifiedBy:  o.verifiedBy  || null,
      completedAt: o.completedAt || null,
    }));

    console.log(`[GET /admin/orders] status=${status || 'checking'} returned ${shaped.length} orders`);

    return sendSuccess(res, 200, 'Orders fetched successfully', {
      orders: shaped,
      count:  shaped.length,
    });
  } catch (error) {
    console.error('[getOrders]', error);
    return sendError(res, 500, 'Failed to fetch orders');
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  PATCH /api/admin/orders/:id/verify
//  Approve or reject a payment slip — changes order status
// ════════════════════════════════════════════════════════════════════════════
/**
 * Request body:
 * {
 *   "status": "completed" | "rejected",
 *   "note":   "optional reason (required for rejection)"
 * }
 *
 * Response 200:
 * {
 *   "message": "Order status updated",
 *   "orderId": "id",
 *   "status":  "completed"
 * }
 */
const verifyOrderHandler = async (req, res) => {
  try {
    const { id }             = req.params;
    const { status, note }   = req.body;

    // ── 1. Validate status field is present ───────────────────────────────
    if (!status) {
      return sendError(res, 400, 'status is required. Use "completed" or "rejected"');
    }

    // ── 2. Validate status is one of the two allowed values ───────────────
    if (!['completed', 'rejected'].includes(status)) {
      return sendError(res, 400, 'status must be "completed" or "rejected"');
    }

    // ── 3. Require note when rejecting ────────────────────────────────────
    if (status === 'rejected' && (!note || !note.trim())) {
      return sendError(res, 400, 'note is required when rejecting an order');
    }

    // ── 4. Delegate to service (state machine + Firestore update) ─────────
    await verifyOrder(id, status, req.user.uid, note?.trim() || null);

    console.log(`[PATCH /admin/orders/${id}/verify] status→${status} by admin:${req.user.uid}`);

    // ── 5. Respond with API spec shape ────────────────────────────────────
    return sendSuccess(res, 200, 'Order status updated', {
      message: 'Order status updated',
      orderId: id,
      status,
    });

  } catch (err) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return sendError(res, 404, 'Order not found');
    }
    if (err.message === 'INVALID_STATUS') {
      return sendError(res, 400, 'status must be "completed" or "rejected"');
    }
    if (err.message === 'INVALID_TRANSITION') {
      return sendError(res, 409,
        'Cannot verify this order. Only orders with status "checking" can be approved or rejected.'
      );
    }
    console.error('[verifyOrderHandler]', err);
    return sendError(res, 500, 'Failed to update order status');
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  Image Moderation
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/images/pending
const getPendingImagesList = async (req, res) => {
  try {
    const images = await getPendingImages(parseInt(req.query.limit) || 50);
    return sendSuccess(res, 200, 'Pending images fetched', { images, count: images.length });
  } catch (error) {
    console.error('[getPendingImagesList]', error);
    return sendError(res, 500, 'Failed to fetch pending images');
  }
};

// PUT /api/admin/images/:id/approve
const approveImage = async (req, res) => {
  try {
    const image = await getImageById(req.params.id);
    if (!image) return sendError(res, 404, 'Image not found');

    if (![IMAGE_STATUS.PENDING, IMAGE_STATUS.REJECTED].includes(image.status)) {
      return sendError(res, 409, `Cannot approve image with status "${image.status}"`);
    }

    await updateImage(req.params.id, {
      status:     IMAGE_STATUS.APPROVED,
      approvedAt: new Date().toISOString(),
      adminNote:  null,
    });

    console.log(`[approveImage] Image approved: ${req.params.id} by admin:${req.user.uid}`);
    return sendSuccess(res, 200, 'Image approved and now live');
  } catch (error) {
    console.error('[approveImage]', error);
    return sendError(res, 500, 'Failed to approve image');
  }
};

// PUT /api/admin/images/:id/reject
const rejectImage = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return sendError(res, 400, 'reason is required');

    const image = await getImageById(req.params.id);
    if (!image) return sendError(res, 404, 'Image not found');

    await updateImage(req.params.id, {
      status:    IMAGE_STATUS.REJECTED,
      adminNote: reason.trim(),
    });

    return sendSuccess(res, 200, 'Image rejected', { reason: reason.trim() });
  } catch (error) {
    console.error('[rejectImage]', error);
    return sendError(res, 500, 'Failed to reject image');
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  Dashboard
// ════════════════════════════════════════════════════════════════════════════
const getDashboard = async (req, res) => {
  try {
    const [usersSnap, approvedSnap, pendingImgSnap, completedSnap, checkingSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('images').where('status', '==', 'approved').count().get(),
      db.collection('images').where('status', '==', 'pending').count().get(),
      db.collection('orders').where('status', '==', 'completed').count().get(),
      db.collection('orders').where('status', '==', 'checking').count().get(),
    ]);

    const completedDocs = await db.collection('orders').where('status', '==', 'completed').get();
    const totalRevenue  = completedDocs.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);

    return sendSuccess(res, 200, 'Dashboard stats', {
      totalUsers:          usersSnap.data().count,
      approvedImages:      approvedSnap.data().count,
      pendingImages:       pendingImgSnap.data().count,
      completedOrders:     completedSnap.data().count,
      pendingVerification: checkingSnap.data().count,
      totalRevenue:        parseFloat(totalRevenue.toFixed(2)),
    });
  } catch (error) {
    console.error('[getDashboard]', error);
    return sendError(res, 500, 'Failed to load dashboard');
  }
};

module.exports = {
  getOrders,
  verifyOrderHandler,
  getPendingImagesList,
  approveImage,
  rejectImage,
  getDashboard,
};