const express = require('express');
const router = express.Router();
const { uploadProduct, uploadSlip } = require('../middleware/roleMiddleware');
const imageController = require('../controllers/imageController');
const orderController = require('../controllers/orderController');

// --- Image Routes ---
// POST: Seller ลงขายรูป (ส่ง field ชื่อ 'image' มา)
router.post('/images', uploadProduct.single('image'), imageController.uploadImage);
// GET: Buyer ดูรูปทั้งหมด
router.get('/images', imageController.getAllImages);

// --- Order Routes (Sequence Diagram Implementation) ---
// 1. Buyer ส่งสลิป (ส่ง field ชื่อ 'slip' มา)
router.post('/orders/upload-slip', uploadSlip.single('slip'), orderController.uploadSlipAndCreateOrder);

// 2. Admin กดอนุมัติ
router.patch('/orders/approve/:orderId', orderController.approveOrder);

// 3. Buyer เช็คสิทธิ์ดาวน์โหลด
router.get('/orders/download/:orderId', orderController.checkDownloadPermission);

module.exports = router;