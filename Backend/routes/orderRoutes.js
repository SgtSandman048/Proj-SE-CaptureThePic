// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/authMiddleware');
const { checkBan }     = require('../middleware/banMiddleware');
const orderController = require('../controllers/orderController');

// Store slip files before uploading
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
  },
});

router.post('/',                  authenticate, checkBan, orderController.createOrder);

router.patch('/:id/upload-slip',  authenticate, checkBan, upload.single('slipFile'), orderController.uploadSlip);

router.get('/my-orders',          authenticate, checkBan, orderController.getMyOrders);

router.get('/:id/watermark',      authenticate, checkBan, orderController.getWatermarked);

router.get('/:id/download',       authenticate, checkBan, orderController.getDownloadUrl);

router.delete('/:id',             authenticate, checkBan, orderController.cancelOrder);

module.exports = router;