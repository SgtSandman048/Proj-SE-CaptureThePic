// middleware/uploadMiddleware.js

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Image Storage
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'market_products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

// Slip Storage
const slipStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'payment_slips',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const uploadProduct = multer({ storage: productStorage });
const uploadSlip = multer({ storage: slipStorage });

module.exports = { uploadProduct, uploadSlip };