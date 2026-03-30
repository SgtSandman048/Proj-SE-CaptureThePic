// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { checkBan } = require('../middleware/banMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/',                authenticate, checkBan, notificationController.getNotifications);
router.get('/unread-count',    authenticate, checkBan, notificationController.getUnreadCount); 
router.patch('/read-all',      authenticate, checkBan, notificationController.markAllAsRead);
router.patch('/:id/read',      authenticate, checkBan, notificationController.markAsRead);

module.exports = router;