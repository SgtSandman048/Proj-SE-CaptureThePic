// services/orderService.js
// All order-related API calls.

import api from "./api";

/**
 * GET /orders/my-orders
 * @returns {Array}
 */
export const getMyOrders = async () => {
  const { data } = await api.get("/orders/my-orders");
  if (!data.success) throw new Error(data.message || "Failed to load orders.");
  return data.data || [];
};

/**
 * POST /orders  — create a new order for an image.
 * @param {string} imageId
 * @returns {{ orderId: string }}
 */
export const createOrder = async (imageId) => {
  const { data } = await api.post("/orders", { imageId });
  if (!data.success) throw new Error(data.message || "Order failed.");
  return data.data;
};

/**
 * PATCH /orders/:orderId/upload-slip  — upload a payment slip image.
 * @param {string} orderId
 * @param {File}   file
 */
export const uploadSlip = async (orderId, file) => {
  const form = new FormData();
  form.append("slipFile", file);
  const { data } = await api.patch(`/orders/${orderId}/upload-slip`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!data.success) throw new Error(data.message || "Slip upload failed.");
  return data.data;
};

/**
 * GET /orders/:orderId/download  — get a signed download URL.
 * @param {string} orderId
 * @returns {string}  signed URL
 */
export const getDownloadUrl = async (orderId) => {
  const { data } = await api.get(`/orders/${orderId}/download`);
  if (!data.success) throw new Error(data.message || "Download failed.");
  return data.data.downloadUrl;
};

export const getWatermarkedUrl = async (orderId) => {
  const { data } = await api.get(`/orders/${orderId}/watermark`);
  if (!data.success) throw new Error(data.message || "Download failed.");
  return data.data.downloadUrl;
};

/**
 * DELETE /orders/:orderId/
 * @param {string} orderId
 */
export const cancelOrder = async (orderId) => {
  const { data } = await api.delete(`/orders/${orderId}/`);
  if (!data.success) throw new Error(data.message || "Cancel failed.");
  return data.data;
};

/**
 * GET /notifications/count  — for admin badge.
 * @returns {number}
 */
export const getNotificationCount = async () => {
  const { data } = await api.get("/notifications/count");
  return data.success ? (data.data?.count ?? 0) : 0;
};
