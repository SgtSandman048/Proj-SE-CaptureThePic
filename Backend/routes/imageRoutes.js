// routes/imageRoutes.js

const express = require('express');
const multer  = require('multer');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  getImages,
  uploadImage,
  getImageDetail,
  deleteImage,
  getMyImages,
} = require('../controllers/imageController');

const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireSeller } = require('../middleware/roleMiddleware');
const { uploadWatermarked, uploadOriginal } = require('../config/cloudinary');
const { IMAGE_CATEGORIES } = require('../models/imageModel');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },   // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and TIFF are allowed.'), false);
  },
});

const uploadValidators = [
  body('imageName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('imageName must be 3–100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description must be under 1000 characters'),

  body('price')
    .notEmpty().withMessage('price is required')
    .isFloat({ min: 10, max: 100000 })
    .withMessage('price must be between 10 and 100,000 THB'),

  body('category')
    .notEmpty().withMessage('category is required')
    .isIn(IMAGE_CATEGORIES)
    .withMessage(`category must be one of: ${IMAGE_CATEGORIES.join(', ')}`),
];


router.get('/', optionalAuthenticate, getImages);

router.post('/upload',
  authenticate,
  requireSeller,
  upload.single('file'),  
  uploadValidators,
  uploadImage
);

router.get('/my', authenticate, requireSeller, getMyImages);

router.get('/:id', optionalAuthenticate, getImageDetail);

router.delete('/:id', authenticate, deleteImage);

module.exports = router;