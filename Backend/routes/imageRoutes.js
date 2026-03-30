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
  updateImage,
  //updateImageDetail,
} = require('../controllers/imageController');

const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { checkBan } = require('../middleware/banMiddleware');
const { /*requireSeller,*/ requireUser } = require('../middleware/roleMiddleware');
const { uploadWatermarked, uploadOriginal } = require('../config/cloudinary');
const { IMAGE_CATEGORIES } = require('../models/imageModel');

// Store image files before uploading
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },   // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and TIFF are allowed.'), false);
  },
});

const updateValidators = [
  body('imageName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('imageName must be 3–100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description must be under 1000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('price must be between 0 and 100,000 THB'),

  body('category')
    .optional()
    .custom((val) => {
      if (!IMAGE_CATEGORIES.includes(val.toLowerCase())) {
        throw new Error(`category must be one of: ${IMAGE_CATEGORIES.join(', ')}`);
      }
      return true;
    }),
];

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
  requireUser,
  //requireSeller,
  upload.single('file'),  
  uploadValidators,
  uploadImage
);

router.get('/my', authenticate, checkBan, requireUser, getMyImages);

router.get('/:id', optionalAuthenticate, getImageDetail);

router.patch('/:id', authenticate, checkBan, requireUser, updateValidators, updateImage);

router.delete('/:id', authenticate, checkBan, deleteImage);

module.exports = router;