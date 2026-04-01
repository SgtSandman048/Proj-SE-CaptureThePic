// services/imageService.js

const { db, FieldValue } = require('../config/firebase');
const { IMAGE_STATUS } = require('../models/imageModel');
const { createNotification, notifyAdminsNewImage, } = require('./notificationService');

const COL = 'images';

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
    meta:    { imageId: ref.id, imageName: imageDocument.imageName },
  });

  notifyAdminsNewImage({
    imageId:    ref.id,
    imageName:  imageDocument.imageName,
    sellerName: imageDocument.sellerName || null,
  });

  return ref.id;
};

const getImageById = async (imageId) => {
  const snap = await db().collection(COL).doc(imageId).get();
  if (!snap.exists) return null;
  return { imageId: snap.id, ...snap.data() };
};

const getApprovedImages = async ({
  category = null,
  search = null,
  tag = null,
  sellerName = null,
  minPrice = null,
  maxPrice = null,
  limit = 20,
} = {}) => {
  // Fetch all approved images — no orderBy to avoid index requirement
  const snap = await db()
    .collection(COL)
    .where('status', '==', IMAGE_STATUS.APPROVED)
    .get();

  let docs = snap.docs.map((d) => ({ imageId: d.id, ...d.data() }));

  // Sort by uploadDate in memory
  docs.sort((a, b) => {
    const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
    const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
    return dateB - dateA;
  });

  // Filter by category
  if (category) {
    docs = docs.filter(d => d.category?.toLowerCase() === category.toLowerCase());
  }

  // Filter by name
  if (search && !tag) {
    const keyword = search.toLowerCase().trim();
    docs = docs.filter(d =>
      d.imageName?.toLowerCase().includes(keyword) ||
      d.description?.toLowerCase().includes(keyword)
    );
  }

  // Filter by tag in memory
  if (tag) {
    const t = tag.toLowerCase().trim().replace(/^#/, '');
    docs = docs.filter(d =>
      d.tags?.some(dt => dt.toLowerCase().replace(/^#/, '').includes(t))
    );
  }

  // Filter by sellerName in memory
  if (sellerName) {
    const s = sellerName.toLowerCase().trim();
    docs = docs.filter(d => d.sellerName?.toLowerCase().includes(s));
  }

  // Filter by price
  if (minPrice !== null) docs = docs.filter(d => d.price >= minPrice);
  if (maxPrice !== null) docs = docs.filter(d => d.price <= maxPrice);

  // Apply limit
  return docs.slice(0, parseInt(limit) || 20);
};
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

const getPendingImages = async (limit = 50) => {
  const snap = await db()
    .collection(COL)
    .where('status', '==', IMAGE_STATUS.PENDING)
    .orderBy('uploadDate', 'asc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ imageId: d.id, ...d.data() }));
};

const updateImage = async (imageId, fields) => {
  await db()
    .collection(COL)
    .doc(imageId)
    .update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
};

const incrementStat = async (imageId, field, amount = 1) => {
  await db()
    .collection(COL)
    .doc(imageId)
    .update({
      [field]: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
};

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
  createImage, getImageById, getApprovedImages,
  getSellerImages, getPendingImages, updateImage,
  incrementStat, softDeleteImage,
};