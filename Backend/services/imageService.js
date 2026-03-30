// services/imageService.js

const { db, FieldValue } = require('../config/firebase');
const { IMAGE_STATUS } = require('../models/imageModel');
const { createNotification } = require('./notificationService');

const COL = 'images';

// Create Image
const createImage = async (imageDocument) => {
  const keywords = imageDocument.imageName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const ref = await db()
    .collection(COL)
    .add({ ...imageDocument, searchKeywords: keywords });

  // Notify the seller — photo uploaded successfully
  await createNotification(imageDocument.sellerId, {
    type: 'photo_uploaded',
    message: `Your photo "${imageDocument.imageName}" has been uploaded and is pending review`,
  });

  return ref.id;
};

// Read a image
const getImageById = async (imageId) => {
  const snap = await db().collection(COL).doc(imageId).get();
  if (!snap.exists) return null;
  return { imageId: snap.id, ...snap.data() };
};

// Browse approved images with filters
const getApprovedImages = async ({
  category = null,
  search = null,
  minPrice = null,
  maxPrice = null,
  limit = 20,
  startAfter = null,
} = {}) => {
  let query = db()
    .collection(COL)
    .where('status', '==', IMAGE_STATUS.APPROVED);

  if (category) {
    query = query.where('category', '==', category);
  }
  if (minPrice !== null) {
    query = query.where('price', '>=', parseFloat(minPrice));
  }
  if (maxPrice !== null) {
    query = query.where('price', '<=', parseFloat(maxPrice));
  }
  if (search) {
    const keyword = search.toLowerCase().trim().split(/\s+/)[0];
    query = query.where('searchKeywords', 'array-contains', keyword);
  }
  if (minPrice !== null || maxPrice !== null) {
    query = query.orderBy('price', 'asc');
  } else {
    query = query.orderBy('uploadDate', 'desc');
  }

  query = query.limit(parseInt(limit) || 20);

  if (startAfter) {
    const cursorSnap = await db().collection(COL).doc(startAfter).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  return snap.docs.map((d) => ({ imageId: d.id, ...d.data() }));
};

// Seller's own images (all status)
const getSellerImages = async (sellerId) => {
  const snap = await db()
    .collection(COL)
    .where('sellerId', '==', sellerId)
    .where('status', '!=', IMAGE_STATUS.DELETED)
    .orderBy('status')
    .orderBy('uploadDate', 'desc')
    .get();
  return snap.docs.map((d) => ({ imageId: d.id, ...d.data() }));
};

// Admin: images awaiting approval
const getPendingImages = async (limit = 50) => {
  const snap = await db()
    .collection(COL)
    .where('status', '==', IMAGE_STATUS.PENDING)
    .orderBy('uploadDate', 'asc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ imageId: d.id, ...d.data() }));
};


// Update fields
const updateImage = async (imageId, fields) => {
  await db()
    .collection(COL)
    .doc(imageId)
    .update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
};

// Increment a numeric stat field
const incrementStat = async (imageId, field, amount = 1) => {
  await db()
    .collection(COL)
    .doc(imageId)
    .update({
      [field]: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
};

// Delete image
const softDeleteImage = async (imageId) => {
  await db()
    .collection(COL)
    .doc(imageId)
    .update({
      status: IMAGE_STATUS.DELETED,
      updatedAt: FieldValue.serverTimestamp(),
    });
};

module.exports = {
  createImage,
  getImageById,
  getApprovedImages,
  getSellerImages,
  getPendingImages,
  updateImage,
  incrementStat,
  softDeleteImage,
};