// services/notificationService.js

const { db, FieldValue } = require('../config/firebase');
const NOTIF_COL = 'notifications';

// Get all notifications for a user
const getNotifications = async (userId) => {
  const snapshot = await db()
    .collection(NOTIF_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() ?? null,
  }));
};

// Mark one notification as read
const markAsRead = async (notifId, userId) => {
  const ref = db().collection(NOTIF_COL).doc(notifId);
  const doc = await ref.get();

  if (!doc.exists) throw new Error('NOT_FOUND');
  if (doc.data().userId !== userId) throw new Error('FORBIDDEN');

  await ref.update({ read: true });
};

// Mark all notifications as read for a user
const markAllAsRead = async (userId) => {
  const snapshot = await db()
    .collection(NOTIF_COL)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  const batch = db().batch();
  snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
  await batch.commit();
};

// Create a notification (called from other services)
const createNotification = async (userId, { type, message, meta }) => {
  await db().collection(NOTIF_COL).add({
    userId,
    type,
    message,
    meta,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
};

// Admin Section
const getAdminUids = async () => {
  const snap = await db()
    .collection('users')
    .where('role', '==', 'admin')
    .get();
  return snap.docs.map(d => d.id);
};

// Send a notification to ALL admin accounts
const notifyAdmins = async ({ type, message, meta = {} }) => {
  const adminUids = await getAdminUids();
  if (!adminUids.length) return;
 
  const batch = db().batch();
  adminUids.forEach(uid => {
    const ref = db().collection(NOTIF_COL).doc();
    batch.set(ref, {
      userId: uid,
      type,
      message,
      meta,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  console.log(`[notificationService] Notified ${adminUids.length} admin(s): ${type}`);
};

// Notify when a user uploads a new image
const notifyAdminsNewImage = (info) =>
  notifyAdmins({
    type:    'new_image_pending',
    message: `📷 New image pending review: "${info.imageName}" by ${info.sellerName || 'a seller'}`,
    meta:    { imageId: info.imageId, imageName: info.imageName, sellerName: info.sellerName },
  }).catch(e => console.warn('[notifyAdminsNewImage]', e.message));


const notifyAdminsSlipUploaded = (info) =>
  notifyAdmins({
    type:    'new_slip_uploaded',
    message: `💳 Payment slip uploaded for "${info.imageName}" — ฿${info.amount?.toLocaleString() ?? '?'} awaiting verification`,
    meta:    { orderId: info.orderId, imageName: info.imageName, userId: info.userId, amount: info.amount },
  }).catch(e => console.warn('[notifyAdminsSlipUploaded]', e.message));


const notifyUserOrderApproved = (info) =>
  createNotification(info.userId, {
    type:    'purchase_complete',
    message: `✅ Your payment for "${info.imageName}" was approved — download is ready!`,
    meta:    { orderId: info.orderId, imageName: info.imageName },
  }).catch(e => console.warn('[notifyUserOrderApproved]', e.message));

const notifyUserOrderRejected = (info) =>
  createNotification(info.userId, {
    type:    'payment_rejected',
    message: `❌ Payment rejected for "${info.imageName}": ${info.adminNote || 'Please re-upload your slip.'}`,
    meta:    { orderId: info.orderId, imageName: info.imageName },
  }).catch(e => console.warn('[notifyUserOrderRejected]', e.message));


const notifySellerImageApproved = (info) =>
  createNotification(info.sellerId, {
    type:    'photo_approved',
    message: `🎉 Your image "${info.imageName}" was approved and is now live in the marketplace!`,
    meta:    { imageId: info.imageId, imageName: info.imageName },
  }).catch(e => console.warn('[notifySellerImageApproved]', e.message));

const notifySellerImageRejected = (info) =>
  createNotification(info.sellerId, {
    type:    'photo_rejected',
    message: `⚠️ Your image "${info.imageName}" was rejected: ${info.reason || 'Please review and re-upload.'}`,
    meta:    { imageId: info.imageId, imageName: info.imageName },
  }).catch(e => console.warn('[notifySellerImageRejected]', e.message));

module.exports = { getNotifications, markAsRead, markAllAsRead, createNotification, notifyAdmins, notifyAdminsNewImage, notifyAdminsSlipUploaded,notifyUserOrderApproved, notifyUserOrderRejected, notifySellerImageApproved, notifySellerImageRejected,};