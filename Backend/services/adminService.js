/**
 * services/adminService.js
 * ─────────────────────────────────────────────────────────
 * Firestore business logic for Admin Operations:
 *
 *   getCheckingOrders()   — fetch all orders with status "checking"
 *   verifyOrder()         — transition order to "completed" or "rejected"
 *
 * Error contract (thrown as Error with message string):
 *   'ORDER_NOT_FOUND'      — orderId does not exist
 *   'INVALID_STATUS'       — body status is not "completed" or "rejected"
 *   'INVALID_TRANSITION'   — current order status cannot move to target
 *                            e.g. trying to verify a "pending" order
 */
const { db: getDb, FieldValue } = require('../config/firebase');
const { isValidTransition }     = require('../models/orderModel');

// Resolve Firestore instance once — Firebase initialised before this module loads
const db = getDb();

const ORDERS_COL = 'orders';
const IMAGES_COL = 'images';
const USERS_COL  = 'users';

// ── getCheckingOrders ───────────────────────────────────────────────────────
/**
 * Return all orders currently awaiting admin verification (status: "checking").
 * Sorted oldest-first so admins work through the queue in arrival order.
 *
 * @returns {object[]} Array of order documents with id attached
 */
const getCheckingOrders = async () => {
  const snap = await db
    .collection(ORDERS_COL)
    .where('status', '==', 'checking')
    .orderBy('updatedAt', 'asc')    // oldest slip upload first
    .get();

  return snap.docs.map((doc) => ({ orderId: doc.id, ...doc.data() }));
};

// ── verifyOrder ─────────────────────────────────────────────────────────────
/**
 * Transition an order to "completed" or "rejected".
 * Uses isValidTransition() from orderModel to enforce the state machine:
 *   checking → completed  ✅
 *   checking → rejected   ✅
 *   pending  → completed  ❌  throws INVALID_TRANSITION
 *   any      → checking   ❌  throws INVALID_TRANSITION
 *
 * On approval ("completed"):
 *   - Updates order status + timestamps
 *   - Increments image.purchases counter
 *   - Adds imageId to buyer's purchasedImages array
 *
 * On rejection ("rejected"):
 *   - Updates order status
 *   - Buyer can re-upload slip (orderService.uploadSlip allows pending → checking again)
 *
 * @param {string} orderId      — Firestore order document ID
 * @param {string} targetStatus — "completed" or "rejected"
 * @param {string} adminUid     — UID of the admin performing the action
 * @param {string} [adminNote]  — Optional note (required for rejections)
 */
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