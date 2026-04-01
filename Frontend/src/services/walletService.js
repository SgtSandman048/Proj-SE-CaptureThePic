// services/walletService.js
// All wallet / payment-related API calls for the frontend.

import api from "./api";

// ── Wallet initialization ──────────────────────────────────────

/**
 * POST /wallet/initialize
 * One-time call to activate the seller wallet for a new user.
 * Returns the freshly initialized wallet data.
 */
export const initializeWallet = async () => {
  const { data } = await api.post("/wallet/initialize");
  if (!data.success) throw new Error(data.message || "Failed to initialize wallet");
  return data.data;
};

// ── Wallet balance ─────────────────────────────────────────────

/**
 * GET /wallet
 * Returns { balance, totalEarned, totalWithdrawn, pendingWithdrawal, available }
 */
export const getWallet = async () => {
  const { data } = await api.get("/wallet");
  if (!data.success) throw new Error(data.message || "Failed to fetch wallet");
  return data.data;
};

// ── Transaction history ────────────────────────────────────────

/**
 * GET /wallet/transactions
 * @param {{ limit?: number, startAfter?: string }} opts
 * @returns {{ transactions, count, nextCursor }}
 */
export const getTransactions = async ({ limit = 20, startAfter = null } = {}) => {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (startAfter) params.set("startAfter", startAfter);

  const { data } = await api.get(`/wallet/transactions?${params}`);
  if (!data.success) throw new Error(data.message || "Failed to fetch transactions");
  return data.data;
};

// ── Withdrawal requests ────────────────────────────────────────

/**
 * GET /wallet/withdrawals
 * Returns all withdrawal requests made by the current seller.
 */
export const getMyWithdrawals = async () => {
  const { data } = await api.get("/wallet/withdrawals");
  if (!data.success) throw new Error(data.message || "Failed to fetch withdrawals");
  return data.data?.withdrawals || [];
};

/**
 * POST /wallet/withdraw
 * Create a new withdrawal request.
 * @param {{ amount, bankName, accountNumber, accountName, note? }} payload
 */
export const requestWithdrawal = async ({ amount, bankName, accountNumber, accountName, note = "" }) => {
  const { data } = await api.post("/wallet/withdraw", {
    amount,
    bankName,
    accountNumber,
    accountName,
    note,
  });
  if (!data.success) {
    // Surface express-validator detail messages
    const details = data.details;
    const msg = Array.isArray(details)
      ? details.map((d) => d.msg).join(" · ")
      : data.message;
    throw new Error(msg || "Failed to request withdrawal");
  }
  return data.data;
};

/**
 * DELETE /wallet/withdrawals/:id
 * Cancel a pending withdrawal request.
 * @param {string} withdrawalId
 */
export const cancelWithdrawal = async (withdrawalId) => {
  const { data } = await api.delete(`/wallet/withdrawals/${withdrawalId}`);
  if (!data.success) throw new Error(data.message || "Failed to cancel withdrawal");
  return data.data;
};