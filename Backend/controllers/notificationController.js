// controllers/notificationController.js

const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.uid);
    return sendSuccess(res, 200, 'Notifications retrieved successfully', notifications);
  } catch (err) {
    console.error('[getNotifications]', err);
    return sendError(res, 500, 'Failed to fetch notifications');
  }
};

// GET /api/notifications/unread-count
// Lightweight endpoint polled by the admin sidebar badge — returns only the count.
const getUnreadCount = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.uid);
    const count = notifications.filter(n => !n.read).length;
    return sendSuccess(res, 200, 'Unread count fetched', { count });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    return sendError(res, 500, 'Failed to fetch unread count');
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id, req.user.uid);
    return sendSuccess(res, 200, 'Notification marked as read', { id });
  } catch (err) {
    if (err.message === 'NOT_FOUND') return sendError(res, 404, 'Notification not found');
    if (err.message === 'FORBIDDEN') return sendError(res, 403, 'Access denied');
    console.error('[markAsRead]', err);
    return sendError(res, 500, 'Failed to mark notification as read');
  }
};

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.uid);
    return sendSuccess(res, 200, 'All notifications marked as read', {});
  } catch (err) {
    console.error('[markAllAsRead]', err);
    return sendError(res, 500, 'Failed to mark all notifications as read');
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };