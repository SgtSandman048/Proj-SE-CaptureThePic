// config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
//const logger = require('../utils/logger');

// SDK Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

//logger.info('✅ Cloudinary configured');
console.log('[!] Connected to Cloudinary');

// File filter
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and TIFF are allowed.'), false);
  }
};

const slipFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid slip file type. Only JPEG, PNG, WEBP allowed.'), false);
};

// Watermark Storage
const watermarkStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseName = file.originalname.replace(/\.[^/.]+$/, ''); // strip extension
    return {
      folder: 'image-store/watermarked',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      public_id: `wm_${Date.now()}_${baseName}`,
      transformation: [
        { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' },
        {
          overlay: {
            font_family: 'Arial',
            font_size: 55,
            font_weight: 'bold',
            text: '© ImageStore',
          },
          color: '#FFFFFF',
          opacity: 45,
          gravity: 'center',
          angle: -30,
          y: -20,
        },
        {
          overlay: {
            font_family: 'Arial',
            font_size: 45,
            font_weight: 'bold',
            text: '© ImageStore',
          },
          color: '#FFFFFF',
          opacity: 30,
          gravity: 'south_east',
          angle: -30,
          x: 20,
          y: 20,
        },
      ],
    };
  },
});

// Original Storage
const originalStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseName = file.originalname.replace(/\.[^/.]+$/, '');
    return {
      folder: 'image-store/originals',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'raw'],
      type: 'private',                    // 🔒 Private — not publicly accessible
      public_id: `orig_${Date.now()}_${baseName}`,
    };
  },
});

const slipStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'image-store/slips',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    type: 'private',   // 🔒 Private — admin eyes only
    public_id: `slip_${req.params.id || 'unknown'}_${Date.now()}`,
    transformation: [
      // Resize large slip images to save storage — keep readable quality
      { width: 1600, crop: 'limit', quality: 'auto:good' },
    ],
  }),
});

// Multer values
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_SLIP_SIZE  = 10 * 1024 * 1024;  // 10 MB for slips

// Upload watermarked image
const uploadWatermarked = multer({
  storage: watermarkStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// Upload original image
const uploadOriginal = multer({
  storage: originalStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// Upload slip image
const uploadSlipFile = multer({
  storage: slipStorage,
  limits: { fileSize: MAX_SLIP_SIZE },
  fileFilter: slipFileFilter,
});

// Generate download URL
const generateSignedUrl = (publicId, expiresIn = 3600) => {
  return cloudinary.utils.private_download_url(publicId, 'jpg', {
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    // True = Force download, False = View before download
    attachment: true,
  });
};

// Delete image by id
const deleteCloudinaryImage = async (publicId, type = 'upload') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type,
    });
    //logger.info(`Cloudinary delete [${publicId}]: ${result.result}`);
    console.log(`[!] Cloudinary has deleted [${publicId}]: ${result.result}`);
    return result;
  } catch (error) {
    //logger.error(`Cloudinary delete failed [${publicId}]:`, error.message);
    console.error(`[!] Cloudinary cannot delete [${publicId}]:`, error.message);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadWatermarked,
  uploadOriginal,
  uploadSlipFile,
  generateSignedUrl,
  deleteCloudinaryImage,
};