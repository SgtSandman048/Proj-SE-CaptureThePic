// services/adminService.js

const { db: getDb, FieldValue } = require('../config/firebase');
const { isValidTransition }     = require('../models/orderModel');

const {
  notifyUserOrderApproved,
  notifyUserOrderRejected,
  notifySellerImageApproved, 
  notifySellerImageRejected,
} = require('./notificationService');

// Resolve Firestore instance once — Firebase initialised before this module loads
const db = getDb();

const ORDERS_COL = 'orders';
const IMAGES_COL = 'images';
const USERS_COL  = 'users';

// Orders Moderation

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

    notifyUserOrderApproved({
      userId:    order.userId,
      orderId,
      imageName: order.imageName || order.imageId,
    });

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

    notifyUserOrderRejected({
      userId:    order.userId,
      orderId,
      imageName: order.imageName || order.imageId,
      adminNote: adminNote,
    });

    console.log(`[adminService] ❌ Order REJECTED: ${orderId} by admin:${adminUid}`);
  }
};


const getAllOrders = async ({ statusFilter = null, limit = 50 } = {}) => {
  let query = db.collection(ORDERS_COL).orderBy('updatedAt', 'desc').limit(limit);
  if (statusFilter) {
    query = query.where('status', '==', statusFilter);
  }
  const snap = await query.get();
  return snap.docs.map((doc) => ({ orderId: doc.id, ...doc.data() }));
};

// Image Moderation
const approveImageAndNotify = async (imageId, adminUid) => {
  const imageRef  = db.collection(IMAGES_COL).doc(imageId);
  const imageSnap = await imageRef.get();
  if (!imageSnap.exists) throw new Error('IMAGE_NOT_FOUND');
 
  const image = imageSnap.data();
  const now   = new Date().toISOString();
 
  await imageRef.update({ status: 'approved', approvedAt: now, adminNote: null, updatedAt: now });
 
  // 🎉 Notify seller: image is live
  notifySellerImageApproved({
    sellerId:  image.sellerId,
    imageId,
    imageName: image.imageName || imageId,
  });
 
  console.log(`[adminService] ✅ Image APPROVED: ${imageId} by admin:${adminUid}`);
};
 
/**
 * Reject a pending image and notify the seller.
 * Replaces the inline Firestore update in adminController.rejectImage.
 */
const rejectImageAndNotify = async (imageId, reason, adminUid) => {
  const imageRef  = db.collection(IMAGES_COL).doc(imageId);
  const imageSnap = await imageRef.get();
  if (!imageSnap.exists) throw new Error('IMAGE_NOT_FOUND');
 
  const image = imageSnap.data();
  const now   = new Date().toISOString();
 
  await imageRef.update({ status: 'rejected', adminNote: reason.trim(), updatedAt: now });
 
  // ⚠️ Notify seller: image rejected with reason
  notifySellerImageRejected({
    sellerId:  image.sellerId,
    imageId,
    imageName: image.imageName || imageId,
    reason:    reason.trim(),
  });
 
  console.log(`[adminService] ❌ Image REJECTED: ${imageId} by admin:${adminUid}`);
};


// User Moderation
const getAllUsers = async ({ search = null, role = null, banned = null, limit = 100 } = {}) => {
  let query = db.collection(USERS_COL).limit(limit);
 
  if (role)           query = query.where('role', '==', role);
  if (banned === true)  query = query.where('isBanned', '==', true);
  if (banned === false) query = query.where('isBanned', '==', false);
 
  const snap = await query.get();
  let users = snap.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
 
  // Client-side search (Firestore lacks native full-text)
  if (search) {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email    || '').toLowerCase().includes(q) ||
        (u.userId   || '').toLowerCase().includes(q)
    );
  }
 
  return users.map(({ password, refreshToken, ...safe }) => safe);
};


const getUserById = async (userId) => {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) throw new Error('USER_NOT_FOUND');
 
  const { password, refreshToken, ...user } = doc.data();
 
  const [ordersSnap, imagesSnap] = await Promise.all([
    db.collection(ORDERS_COL).where('userId', '==', userId).count().get(),
    db.collection(IMAGES_COL).where('sellerId', '==', userId)
      .where('status', '!=', 'deleted').count().get(),
  ]);
 
  return {
    userId:  doc.id,
    ...user,
    stats: {
      totalOrders: ordersSnap.data().count,
      totalImages: imagesSnap.data().count,
    },
  };
};


const banUser = async (userId, adminUid, reason = '') => {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) throw new Error('USER_NOT_FOUND');
 
  const user = doc.data();
  if (user.role === 'admin') throw new Error('CANNOT_BAN_ADMIN');
  if (user.isBanned)         throw new Error('ALREADY_BANNED');
 
  const now = new Date().toISOString();
  await db.collection(USERS_COL).doc(userId).update({
    isBanned:  true,
    banReason: reason.trim() || 'Violation of platform policies.',
    bannedAt:  now,
    bannedBy:  adminUid,
    updatedAt: now,
  });
 
  console.log(`[adminService] Banned ${userId} by admin:${adminUid}`);
};


const unbanUser = async (userId, adminUid) => {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) throw new Error('USER_NOT_FOUND');
 
  const user = doc.data();
  if (!user.isBanned) throw new Error('NOT_BANNED');
 
  const now = new Date().toISOString();
  await db.collection(USERS_COL).doc(userId).update({
    isBanned:   false,
    banReason:  null,
    bannedAt:   null,
    bannedBy:   null,
    unbannedAt: now,
    unbannedBy: adminUid,
    updatedAt:  now,
  });
 
  console.log(`[adminService] Unbanned ${userId} by admin:${adminUid}`);
};


const softDeleteUser = async (userId, adminUid) => {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) throw new Error('USER_NOT_FOUND');
 
  const user = doc.data();
  if (user.role === 'admin') throw new Error('CANNOT_DELETE_ADMIN');
 
  const now = new Date().toISOString();
 
  await db.collection(USERS_COL).doc(userId).update({
    isDeleted:  true,
    isBanned:   true,
    username:   `deleted_${userId.slice(0, 8)}`,
    email:      `deleted_${userId.slice(0, 8)}@deleted.invalid`,
    deletedAt:  now,
    deletedBy:  adminUid,
    updatedAt:  now,
  });
 
  // Remove pending/rejected images from the review queue
  const pendingImgs = await db
    .collection(IMAGES_COL)
    .where('sellerId', '==', userId)
    .where('status', 'in', ['pending', 'rejected'])
    .get();
 
  if (!pendingImgs.empty) {
    const batch = db.batch();
    pendingImgs.docs.forEach((imgDoc) =>
      batch.update(imgDoc.ref, { status: 'deleted', updatedAt: now })
    );
    await batch.commit();
  }
 
  console.log(`[adminService] Soft-deleted ${userId} by admin:${adminUid}`);
};
 

const getUserActivity = async (userId) => {
  const doc = await db.collection(USERS_COL).doc(userId).get();
  if (!doc.exists) throw new Error('USER_NOT_FOUND');
 
  const [ordersSnap, imagesSnap] = await Promise.all([
    db.collection(ORDERS_COL)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    db.collection(IMAGES_COL)
      .where('sellerId', '==', userId)
      .orderBy('uploadDate', 'desc')
      .limit(10)
      .get(),
  ]);
 
  return {
    recentOrders: ordersSnap.docs.map((d) => ({ orderId: d.id, ...d.data() })),
    recentImages: imagesSnap.docs.map((d) => {
      const { originalPublicId, watermarkPublicId, ...safe } = d.data();
      return { imageId: d.id, ...safe };
    }),
  };
};

module.exports = { getCheckingOrders, verifyOrder, getAllOrders, approveImageAndNotify, rejectImageAndNotify, getAllUsers, getUserById, banUser, unbanUser, softDeleteUser, getUserActivity,};