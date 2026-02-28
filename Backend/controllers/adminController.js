/**
 * controllers/adminController.js
 *
 * GET  /api/admin/dashboard           — Stats overview
 * GET  /api/admin/users               — All users list
 * PUT  /api/admin/users/:id/status    — Activate / deactivate user
 * PUT  /api/admin/users/:id/role      — Change user role
 * GET  /api/admin/images/pending      — Images awaiting approval
 * PUT  /api/admin/images/:id/approve  — Approve image
 * PUT  /api/admin/images/:id/reject   — Reject image with note
 * GET  /api/admin/orders/pending      — Orders awaiting slip verification
 * PUT  /api/admin/orders/:id/verify   — Complete / reject order
 */
const { validationResult } = require('express-validator');
const { getAllUsers, getUserById, updateUser, deactivateUser } = require('../services/userService');
const { getPendingImages, getImageById, updateImage } = require('../services/imageService');
const {
  getPendingVerificationOrders,
  getOrderById,
  updateOrder,
} = require('../services/orderService');
const { ORDER_STATUS } = require('../models/orderModel');
const { IMAGE_STATUS } = require('../models/imageModel');
const { ROLES } = require('../models/userModel');
const { calculateSellerNet } = require('../utils/priceCalculator');
const { FieldValue } = require('../config/firebase');
const { db } = require('../config/firebase');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ── Dashboard Stats ────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [usersSnap, imagesSnap, ordersSnap] = await Promise.all([
      db().collection('users').count().get(),
      db().collection('images').count().get(),
      db().collection('orders').where('status', '==', ORDER_STATUS.COMPLETED).count().get(),
    ]);

    const revenueSnap = await db()
      .collection('orders')
      .where('status', '==', ORDER_STATUS.COMPLETED)
      .get();

    const totalRevenue = revenueSnap.docs.reduce((sum, d) => sum + (d.data().pricing?.total || 0), 0);

    return sendSuccess(res, 200, 'Dashboard stats', {
      totalUsers: usersSnap.data().count,
      totalImages: imagesSnap.data().count,
      completedOrders: ordersSnap.data().count,
      totalRevenue: totalRevenue.toFixed(2),
    });
  } catch (error) {
    logger.error('getDashboard error:', error);
    return sendError(res, 500, 'Failed to load dashboard');
  }
};

// ── User Management ────────────────────────────────────────────────────────
const listUsers = async (req, res) => {
  try {
    const { limit, startAfter, role } = req.query;
    const users = await getAllUsers({ limit: parseInt(limit) || 20, startAfter, role });
    return sendSuccess(res, 200, 'Users fetched', { users, count: users.length });
  } catch (error) {
    logger.error('listUsers error:', error);
    return sendError(res, 500, 'Failed to fetch users');
  }
};

const setUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return sendError(res, 400, 'isActive must be boolean');

    const user = await getUserById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');

    await updateUser(req.params.id, { isActive });

    // Also disable/enable in Firebase Auth
    const { auth } = require('../config/firebase');
    await auth().updateUser(req.params.id, { disabled: !isActive });

    logger.info(`Admin ${req.user.uid} set user ${req.params.id} isActive=${isActive}`);
    return sendSuccess(res, 200, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    logger.error('setUserStatus error:', error);
    return sendError(res, 500, 'Failed to update user status');
  }
};

const setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) {
      return sendError(res, 400, `Invalid role. Must be: ${Object.values(ROLES).join(', ')}`);
    }

    await updateUser(req.params.id, { role });
    logger.info(`Admin ${req.user.uid} changed role of ${req.params.id} to ${role}`);
    return sendSuccess(res, 200, 'User role updated');
  } catch (error) {
    logger.error('setUserRole error:', error);
    return sendError(res, 500, 'Failed to update role');
  }
};

// ── Image Moderation ───────────────────────────────────────────────────────
const getPendingImagesList = async (req, res) => {
  try {
    const images = await getPendingImages(parseInt(req.query.limit) || 50);
    return sendSuccess(res, 200, 'Pending images fetched', { images, count: images.length });
  } catch (error) {
    logger.error('getPendingImagesList error:', error);
    return sendError(res, 500, 'Failed to fetch pending images');
  }
};

const approveImage = async (req, res) => {
  try {
    const image = await getImageById(req.params.id);
    if (!image) return sendError(res, 404, 'Image not found');

    await updateImage(req.params.id, {
      status: IMAGE_STATUS.APPROVED,
      approvedAt: FieldValue.serverTimestamp(),
      adminNote: null,
    });

    logger.info(`Image approved: ${req.params.id} by admin ${req.user.uid}`);
    return sendSuccess(res, 200, 'Image approved and now live');
  } catch (error) {
    logger.error('approveImage error:', error);
    return sendError(res, 500, 'Failed to approve image');
  }
};

const rejectImage = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return sendError(res, 400, 'Rejection reason is required');

    const image = await getImageById(req.params.id);
    if (!image) return sendError(res, 404, 'Image not found');

    await updateImage(req.params.id, {
      status: IMAGE_STATUS.REJECTED,
      adminNote: reason,
    });

    logger.info(`Image rejected: ${req.params.id} — ${reason}`);
    return sendSuccess(res, 200, 'Image rejected');
  } catch (error) {
    logger.error('rejectImage error:', error);
    return sendError(res, 500, 'Failed to reject image');
  }
};

// ── Order / Slip Verification ──────────────────────────────────────────────
const getPendingOrdersList = async (req, res) => {
  try {
    const orders = await getPendingVerificationOrders();
    return sendSuccess(res, 200, 'Pending orders fetched', { orders, count: orders.length });
  } catch (error) {
    logger.error('getPendingOrdersList error:', error);
    return sendError(res, 500, 'Failed to fetch pending orders');
  }
};

const verifyOrder = async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return sendError(res, 400, 'Action must be "approve" or "reject"');
    }

    const order = await getOrderById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');

    if (order.status !== ORDER_STATUS.SLIP_UPLOADED) {
      return sendError(res, 400, 'Order is not awaiting verification');
    }

    if (action === 'approve') {
      // Fetch image to record revenue on seller profile
      const image = await getImageById(order.imageId);
      const netAmount = image ? calculateSellerNet(order.pricing.total).sellerNet : 0;

      await updateOrder(req.params.id, {
        status: ORDER_STATUS.COMPLETED,
        verifiedBy: req.user.uid,
        completedAt: FieldValue.serverTimestamp(),
        adminNote: note || null,
      });

      // Update image purchase stats
      if (image) {
        const { updateImage: upd, incrementImageStat } = require('../services/imageService');
        await incrementImageStat(order.imageId, 'purchases');
        await incrementImageStat(order.imageId, 'revenue', order.pricing.total);
      }

      // Add to buyer's purchased list
      const { updateUser: upUser } = require('../services/userService');
      await upUser(order.buyerId, {
        purchasedImages: FieldValue.arrayUnion(order.imageId),
      });

      // Update seller revenue
      const sellerDoc = await getUserById(order.sellerId);
      if (sellerDoc?.sellerProfile) {
        await updateUser(order.sellerId, {
          'sellerProfile.totalSales': FieldValue.increment(1),
          'sellerProfile.totalRevenue': FieldValue.increment(netAmount),
        });
      }

      logger.info(`Order COMPLETED: ${req.params.id}`);
      return sendSuccess(res, 200, 'Order approved. Buyer can now download.');
    } else {
      await updateOrder(req.params.id, {
        status: ORDER_STATUS.REJECTED,
        verifiedBy: req.user.uid,
        adminNote: note || 'Slip rejected — please re-upload',
      });

      logger.info(`Order REJECTED: ${req.params.id}`);
      return sendSuccess(res, 200, 'Order rejected. Buyer notified to re-upload slip.');
    }
  } catch (error) {
    logger.error('verifyOrder error:', error);
    return sendError(res, 500, 'Failed to verify order');
  }
};

// Missing import fix
//const { getUserById } = require('../services/userService');

module.exports = {
  getDashboard,
  listUsers,
  setUserStatus,
  setUserRole,
  getPendingImagesList,
  approveImage,
  rejectImage,
  getPendingOrdersList,
  verifyOrder,
};