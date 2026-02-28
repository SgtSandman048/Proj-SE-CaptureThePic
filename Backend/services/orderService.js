// services/orderService.js

const { db: getDb } = require('../config/firebase');
const { cloudinary, generateSignedUrl } = require('../config/cloudinary');
const { calculatePrice } = require('../utils/priceCalculator');

const db = getDb();

const ORDERS_COL = 'orders';
const IMAGES_COL = 'images';


// Create a new order
const createOrder = async ({ userId, imageId }) => {
  // 1. Verify the image exists
  const imageRef = db.collection(IMAGES_COL).doc(imageId);
  const imageSnap = await imageRef.get();
  if (!imageSnap.exists) throw new Error('IMAGE_NOT_FOUND');

  const image = imageSnap.data();

  // 2. Prevent duplicate purchase
  const existingSnap = await db
    .collection(ORDERS_COL)
    .where('userId', '==', userId)
    .where('imageId', '==', imageId)
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  if (!existingSnap.empty) throw new Error('ALREADY_PURCHASED');

  // 3. Calculate final price
  const totalAmount = calculatePrice(image.price);

  // 4. Persist order
  const orderRef = db.collection(ORDERS_COL).doc();
  const now = new Date().toISOString();

  const orderData = {
    userId,
    imageId,
    imageName: image.name,
    totalAmount,
    status: 'pending',
    slipUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  await orderRef.set(orderData);

  return { id: orderRef.id, ...orderData };
};


// Upload a payment slip to Cloudinary
const uploadSlip = async ({ orderId, userId, file }) => {
  const orderRef = db.collection(ORDERS_COL).doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');

  const order = orderSnap.data();

  if (order.userId !== userId) throw new Error('FORBIDDEN');
  if (!['pending', 'checking'].includes(order.status)) throw new Error('INVALID_STATUS');

  // Upload buffer to Cloudinary under a dedicated slips folder
  const slipUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'payment_slips',
        public_id: `slip_${orderId}_${Date.now()}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });

  await orderRef.update({
    slipUrl,
    status: 'checking',
    updatedAt: new Date().toISOString(),
  });
};


// Return all orders for a given user
const getOrdersByUser = async (userId) => {
  const snap = await db
    .collection(ORDERS_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};


// Return the original download URL
const getDownloadUrl = async ({ orderId, userId }) => {
  const orderRef = db.collection(ORDERS_COL).doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');

  const order = orderSnap.data();

  if (order.userId !== userId) throw new Error('FORBIDDEN');
  if (order.status !== 'completed') throw new Error('NOT_COMPLETED');

  // Fetch the image to get the original Cloudinary URL
  const imageSnap = await db.collection(IMAGES_COL).doc(order.imageId).get();
  const image = imageSnap.data();
  if (!image.originalPublicId) throw new Error('ORIGINAL_NOT_FOUND');

  const downloadUrl = generateSignedUrl(image.originalPublicId, 3600);

  return downloadUrl;
};

module.exports = { createOrder, uploadSlip, getOrdersByUser, getDownloadUrl };