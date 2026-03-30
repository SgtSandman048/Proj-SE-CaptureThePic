// services/notificationService.js
// All notification-related API calls.

import api from "./api";

/**
 * GET /notifications — fetch all notifications for logged-in user
 */
export const getNotifications = async () => {
  const { data } = await api.get("/notifications");
  return data.data;
};

export const getUnreadCount = async () => {
  const { data } = await api.get("/notifications/unread-count");
  return data.data?.count ?? 0;
};

/**
 * PATCH /notifications/:id/read — mark one notification as read
 * @param {string} id
 */
export const markAsRead = async (id) => {
  await api.patch(`/notifications/${id}/read`);
};

/**
 * PATCH /notifications/read-all — mark all notifications as read
 */
export const markAllAsRead = async () => {
  await api.patch("/notifications/read-all");
};