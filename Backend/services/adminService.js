// services/adminService.js

const { db: getDb, FieldValue } = require('../config/firebase');
const { isValidTransition }     = require('../models/orderModel');

// Resolve Firestore instance once — Firebase initialised before this module loads
const db = getDb();

const ORDERS_COL = 'orders';
const IMAGES_COL = 'images';
const USERS_COL  = 'users';


const getCheckingOrders = async () => {
  const snap = await db
    .collection(ORDERS_COL)
    .where('status', '==', 'checking')
    .orderBy('updatedAt', 'asc')    // oldest slip upload first
    .get();

  return snap.docs.map((doc) => ({ orderId: doc.id, ...doc.data() }));
};

const verifyOrder = async (orderId, targetStatus, adminUid, adminNote = null) => {
  // ── 1. Validate targetStatus value ───────────────────────────────────────
  const allowedTargets = ['completed', 'rejected'];
  if (!allowedTargets.includes(targetStatus)) {
    throw new Error('INVALID_STATUS');
  }

  // ── 2. Fetch order ────────────────────────────────────────────────────────
  const orderRef  = db.collection(ORDERS_COL).doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');

  const order = orderSnap.data();

  // ── 3. State machine guard ────────────────────────────────────────────────
  // isValidTransition is from models/orderModel.js:
  //   checking → completed  ✅
  //   checking → rejected   ✅
  //   anything else         ❌
  if (!isValidTransition(order.status, targetStatus)) {
    throw new Error('INVALID_TRANSITION');
  }

  const now = new Date().toISOString();

  // ── 4a. APPROVE — status → "completed" ───────────────────────────────────
  if (targetStatus === 'completed') {
    // Update order
    await orderRef.update({
      status:      'completed',
      verifiedBy:  adminUid,
      adminNote:   adminNote || null,
      completedAt: now,
      updatedAt:   now,
    });

    // Increment image purchase counter (fire-and-forget — non-critical)
    db.collection(IMAGES_COL)
      .doc(order.imageId)
      .update({
        purchases: FieldValue.increment(1),
        updatedAt: now,
      })
      .catch((e) => console.warn('[adminService] Could not update image stats:', e.message));

    // Add imageId to buyer's purchasedImages array
    db.collection(USERS_COL)
      .doc(order.userId)
      .update({
        purchasedImages: FieldValue.arrayUnion(order.imageId),
        updatedAt:       now,
      })
      .catch((e) => console.warn('[adminService] Could not update user purchasedImages:', e.message));

    console.log(`[adminService] ✅ Order APPROVED: ${orderId} by admin:${adminUid}`);
  }

  // ── 4b. REJECT — status → "rejected" ─────────────────────────────────────
  else {
    await orderRef.update({
      status:     'rejected',
      verifiedBy: adminUid,
      adminNote:  adminNote || 'Payment rejected. Please re-upload your slip.',
      updatedAt:  now,
    });

    console.log(`[adminService] ❌ Order REJECTED: ${orderId} by admin:${adminUid}`);
  }
};

// ── getAllOrders ─────────────────────────────────────────────────────────────
/**
 * Fetch all orders regardless of status (for admin dashboard overview).
 * Optional status filter via query param.
 *
 * @param {string|null} statusFilter — e.g. 'pending', 'completed', null = all
 * @param {number}      limit
 */
const getAllOrders = async ({ statusFilter = null, limit = 50 } = {}) => {
  let query = db.collection(ORDERS_COL).orderBy('updatedAt', 'desc').limit(limit);
  if (statusFilter) {
    query = query.where('status', '==', statusFilter);
  }
  const snap = await query.get();
  return snap.docs.map((doc) => ({ orderId: doc.id, ...doc.data() }));
};

module.exports = { getCheckingOrders, verifyOrder, getAllOrders };