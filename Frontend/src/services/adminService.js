/**
 * services/adminService.js
 * All admin-related API calls — mirrors adminController.js endpoints.
 *
 * Endpoints consumed:
 *   GET   /admin/orders              → getCheckingOrders / getAllAdminOrders
 *   PATCH /admin/orders/:id/verify   → verifyOrder
 *   GET   /admin/images/pending      → getPendingImages
 *   PUT   /admin/images/:id/approve  → approveImage
 *   PUT   /admin/images/:id/reject   → rejectImage
 *   GET   /admin/dashboard           → getDashboardStats
 */
import api from "./api";

// ── Orders ─────────────────────────────────────────────────────

/**
 * GET /admin/orders
 * Returns orders with status "checking" (awaiting verification).
 * @returns {Array<Order>}
 */
export const getCheckingOrders = async () => {
  const { data } = await api.get("/admin/orders");
  if (!data.success) throw new Error(data.message || "Failed to load orders.");
  return data.data.orders || [];
};

/**
 * GET /admin/orders?all=true  or  ?status=xxx
 * Returns orders with optional status filter.
 * @param {{ status?: string, all?: boolean, limit?: number }} params
 * @returns {Array<Order>}
 */
export const getAllAdminOrders = async ({ status = null, all = false, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (all)    params.set("all", "true");
  if (status) params.set("status", status);
  if (limit)  params.set("limit", String(limit));

  const { data } = await api.get(`/admin/orders?${params}`);
  if (!data.success) throw new Error(data.message || "Failed to load orders.");
  return data.data.orders || [];
};

/**
 * PATCH /admin/orders/:id/verify
 * Approve or reject a payment slip.
 * @param {string} orderId
 * @param {"completed"|"rejected"} status
 * @param {string|null} note  — required when rejecting
 */
export const verifyOrder = async (orderId, status, note = null) => {
  const { data } = await api.patch(`/admin/orders/${orderId}/verify`, { status, note });
  if (!data.success) throw new Error(data.message || "Verification failed.");
  return data.data;
};

// ── Images ─────────────────────────────────────────────────────

/**
 * GET /admin/images/pending
 * Returns images awaiting moderation.
 * @param {number} [limit=50]
 * @returns {Array<Image>}
 */
export const getPendingImages = async (limit = 50) => {
  const { data } = await api.get(`/admin/images/pending?limit=${limit}`);
  if (!data.success) throw new Error(data.message || "Failed to load pending images.");
  return data.data.images || [];
};

/**
 * PUT /admin/images/:id/approve
 * Approve a pending image — makes it live.
 * @param {string} imageId
 */
export const approveImage = async (imageId) => {
  const { data } = await api.put(`/admin/images/${imageId}/approve`);
  if (!data.success) throw new Error(data.message || "Approval failed.");
  return data.data;
};

/**
 * PUT /admin/images/:id/reject
 * Reject a pending image with a reason.
 * @param {string} imageId
 * @param {string} reason  — required
 */
export const rejectImage = async (imageId, reason) => {
  if (!reason?.trim()) throw new Error("A rejection reason is required.");
  const { data } = await api.put(`/admin/images/${imageId}/reject`, { reason: reason.trim() });
  if (!data.success) throw new Error(data.message || "Rejection failed.");
  return data.data;
};


/**
 * GET /admin/users
 * Returns all platform users with optional filters.
 * @param {{ search?: string, role?: string, banned?: boolean|null, limit?: number }} params
 * @returns {Array<User>}
 */
export const getAllUsers = async ({ search = null, role = null, banned = null, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (search)          params.set("search", search);
  if (role)            params.set("role",   role);
  if (banned !== null) params.set("banned", String(banned));
  if (limit)           params.set("limit",  String(limit));
 
  const { data } = await api.get(`/admin/users?${params}`);
  if (!data.success) throw new Error(data.message || "Failed to load users.");
  return data.data.users || [];
};
 
/**
 * GET /admin/users/:id
 * Returns full user profile including order/image stats.
 * @param {string} userId
 * @returns {object}
 */
export const getUserById = async (userId) => {
  const { data } = await api.get(`/admin/users/${userId}`);
  if (!data.success) throw new Error(data.message || "User not found.");
  return data.data;
};
 
/**
 * GET /admin/users/:id/activity
 * Returns the user's 10 most recent orders and uploaded images.
 * @param {string} userId
 * @returns {{ recentOrders: Array, recentImages: Array }}
 */
export const getUserActivity = async (userId) => {
  const { data } = await api.get(`/admin/users/${userId}/activity`);
  if (!data.success) throw new Error(data.message || "Failed to load activity.");
  return data.data;
};
 
/**
 * PATCH /admin/users/:id/ban
 * Bans a user account. reason is displayed to the user on login.
 * @param {string} userId
 * @param {string} [reason=""]
 */
export const banUser = async (userId, reason = "") => {
  const { data } = await api.patch(`/admin/users/${userId}/ban`, { reason: reason.trim() });
  if (!data.success) throw new Error(data.message || "Ban failed.");
  return data.data;
};
 
/**
 * PATCH /admin/users/:id/unban
 * Lifts the ban on a user account.
 * @param {string} userId
 */
export const unbanUser = async (userId) => {
  const { data } = await api.patch(`/admin/users/${userId}/unban`);
  if (!data.success) throw new Error(data.message || "Unban failed.");
  return data.data;
};
 
/**
 * DELETE /admin/users/:id
 * Soft-deletes a user account — anonymises profile and hides pending images.
 * This action cannot be undone from the UI.
 * @param {string} userId
 */
export const deleteUser = async (userId) => {
  const { data } = await api.delete(`/admin/users/${userId}`);
  if (!data.success) throw new Error(data.message || "Delete failed.");
  return data.data;
}

// ── Wallet / Withdrawals ───────────────────────────────────────
 
/**
 * GET /admin/withdrawals
 * Returns withdrawal requests. Default = pending only; pass all=true for all statuses.
 * @param {{ all?: boolean, limit?: number }} params
 * @returns {Array<Withdrawal>}
 */
export const getAdminWithdrawals = async ({ all = false, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (all)   params.set("all",   "true");
  if (limit) params.set("limit", String(limit));
  const { data } = await api.get(`/admin/withdrawals?${params}`);
  if (!data.success) throw new Error(data.message || "Failed to load withdrawals.");
  return data.data.withdrawals || [];
};
 
/**
 * PATCH /admin/withdrawals/:id/process
 * Approve or reject a pending withdrawal request.
 * @param {string} withdrawalId
 * @param {"approved"|"rejected"} status
 * @param {string|null} adminNote  — required when rejecting
 */
export const processWithdrawal = async (withdrawalId, status, adminNote = null) => {
  const { data } = await api.patch(`/admin/withdrawals/${withdrawalId}/process`, {
    status,
    adminNote: adminNote?.trim() || null,
  });
  if (!data.success) throw new Error(data.message || "Failed to process withdrawal.");
  return data.data;
};

// ── Dashboard ──────────────────────────────────────────────────

/**
 * GET /admin/dashboard
 * Returns platform-wide stats.
 * @returns {{ totalUsers, approvedImages, pendingImages, completedOrders, pendingVerification, totalRevenue }}
 */
export const getDashboardStats = async () => {
  const { data } = await api.get("/admin/dashboard");
  if (!data.success) throw new Error(data.message || "Failed to load dashboard.");
  return data.data;
};
