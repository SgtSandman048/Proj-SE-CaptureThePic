// controllers/adminController.js

const { db: getDb }   = require('../config/firebase');
const { getCheckingOrders, verifyOrder, getAllOrders, approveImageAndNotify, rejectImageAndNotify,getAllUsers, getUserById, banUser, unbanUser, softDeleteUser, getUserActivity } = require('../services/adminService');
const { getImageById, updateImage, getPendingImages } = require('../services/imageService');
const { IMAGE_STATUS } = require('../models/imageModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const db = getDb();

//  Orders Moderation

//  GET /api/admin/orders
//  Fetch all orders with status "checking" — awaiting admin verification
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


//  PATCH /api/admin/orders/:id/verify
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

//  Image Moderation

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

    await approveImageAndNotify(req.params.id, req.user.uid);

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

    await rejectImageAndNotify(req.params.id, reason, req.user.uid);

    return sendSuccess(res, 200, 'Image rejected', { reason: reason.trim() });
  } catch (error) {
    console.error('[rejectImage]', error);
    return sendError(res, 500, 'Failed to reject image');
  }
};

//  User Moderation

//  GET /api/admin/users
const listUsers = async (req, res) => {
  try {
    const { search, role, banned, limit } = req.query;
 
    const bannedFilter =
      banned === 'true'  ? true  :
      banned === 'false' ? false : null;
 
    const users = await getAllUsers({
      search: search || null,
      role:   role   || null,
      banned: bannedFilter,
      limit:  parseInt(limit) || 100,
    });
 
    console.log(`[GET /admin/users] ${users.length} users | filters: ${JSON.stringify({ search, role, banned })}`);
 
    return sendSuccess(res, 200, 'Users fetched successfully', {
      users,
      count: users.length,
    });
  } catch (err) {
    console.error('[listUsers]', err);
    return sendError(res, 500, 'Failed to fetch users');
  }
};

//  GET /api/admin/users/:id
const getUserDetail = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    return sendSuccess(res, 200, 'User fetched', user);
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return sendError(res, 404, 'User not found');
    console.error('[getUserDetail]', err);
    return sendError(res, 500, 'Failed to fetch user');
  }
};

//  GET /api/admin/users/:id/activity 
const getUserActivityHandler = async (req, res) => {
  try {
    const activity = await getUserActivity(req.params.id);
    return sendSuccess(res, 200, 'User activity fetched', activity);
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return sendError(res, 404, 'User not found');
    console.error('[getUserActivity]', err);
    return sendError(res, 500, 'Failed to fetch activity');
  }
};
 
//  PATCH /api/admin/users/:id/ban 
const banUserHandler = async (req, res) => {
  try {
    const { reason } = req.body;
    await banUser(req.params.id, req.user.uid, reason || '');
 
    console.log(`[PATCH /admin/users/${req.params.id}/ban] by admin:${req.user.uid}`);
    return sendSuccess(res, 200, 'User banned successfully', {
      userId: req.params.id,
      isBanned: true,
      banReason: reason?.trim() || 'Violation of platform policies.',
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND')    return sendError(res, 404, 'User not found');
    if (err.message === 'CANNOT_BAN_ADMIN') return sendError(res, 403, 'Cannot ban an admin account');
    if (err.message === 'ALREADY_BANNED')   return sendError(res, 409, 'User is already banned');
    console.error('[banUserHandler]', err);
    return sendError(res, 500, 'Failed to ban user');
  }
};
 
//  PATCH /api/admin/users/:id/unban 
const unbanUserHandler = async (req, res) => {
  try {
    await unbanUser(req.params.id, req.user.uid);
 
    console.log(`[PATCH /admin/users/${req.params.id}/unban] by admin:${req.user.uid}`);
    return sendSuccess(res, 200, 'User unbanned successfully', {
      userId: req.params.id,
      isBanned: false,
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return sendError(res, 404, 'User not found');
    if (err.message === 'NOT_BANNED')     return sendError(res, 409, 'User is not currently banned');
    console.error('[unbanUserHandler]', err);
    return sendError(res, 500, 'Failed to unban user');
  }
};

//  DELETE /api/admin/users/:id 
const deleteUserHandler = async (req, res) => {
  try {
    await softDeleteUser(req.params.id, req.user.uid);
 
    console.log(`[DELETE /admin/users/${req.params.id}] by admin:${req.user.uid}`);
    return sendSuccess(res, 200, 'User account deleted', {
      userId:    req.params.id,
      isDeleted: true,
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND')      return sendError(res, 404, 'User not found');
    if (err.message === 'CANNOT_DELETE_ADMIN') return sendError(res, 403, 'Cannot delete an admin account');
    console.error('[deleteUserHandler]', err);
    return sendError(res, 500, 'Failed to delete user');
  }
};

//  Dashboard

//  GET /api/admin/dashboard
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
  listUsers,
  getUserDetail,
  getUserActivityHandler,
  banUserHandler,
  unbanUserHandler,
  deleteUserHandler,
  getDashboard,
};