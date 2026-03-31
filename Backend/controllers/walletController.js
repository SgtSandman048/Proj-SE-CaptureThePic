// controllers/walletController.js

const { validationResult }       = require('express-validator');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  getWallet,
  getTransactions,
  requestWithdrawal,
  cancelWithdrawal,
  getMyWithdrawals,
}                                = require('../services/walletService');
const { MIN_WITHDRAWAL_THB }     = require('../models/walletModel');

// ════════════════════════════════════════════════════════════════
//  GET /api/wallet
//  Returns seller's current balance, lifetime totals, pending amount.
// ════════════════════════════════════════════════════════════════
const getMyWallet = async (req, res) => {
  try {
    const wallet = await getWallet(req.user.uid);
    return sendSuccess(res, 200, 'Wallet fetched', wallet);
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return sendError(res, 404, 'User not found');
    console.error('[getMyWallet]', err);
    return sendError(res, 500, 'Failed to fetch wallet');
  }
};

// ════════════════════════════════════════════════════════════════
//  GET /api/wallet/transactions
//  Returns paginated transaction history (sales + withdrawals).
//  ?limit=20  ?startAfter=txnId
// ════════════════════════════════════════════════════════════════
const getMyTransactions = async (req, res) => {
  try {
    const { limit, startAfter } = req.query;
    const txns = await getTransactions(req.user.uid, {
      limit:      Math.min(parseInt(limit) || 20, 100),
      startAfter: startAfter || null,
    });
    return sendSuccess(res, 200, 'Transactions fetched', {
      transactions: txns,
      count:        txns.length,
      nextCursor:   txns.length > 0 ? txns[txns.length - 1].txnId : null,
    });
  } catch (err) {
    console.error('[getMyTransactions]', err);
    return sendError(res, 500, 'Failed to fetch transactions');
  }
};

// ════════════════════════════════════════════════════════════════
//  POST /api/wallet/withdraw
//  Create a new withdrawal request.
//  Body: { amount, bankName, accountNumber, accountName, note? }
// ════════════════════════════════════════════════════════════════
const createWithdrawal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }

    const { amount, bankName, accountNumber, accountName, note } = req.body;

    const result = await requestWithdrawal(req.user.uid, {
      amount: parseFloat(amount),
      bankName,
      accountNumber,
      accountName,
      note: note || '',
    });

    console.log(`[POST /wallet/withdraw] ฿${amount} requested by ${req.user.uid}`);
    return sendSuccess(res, 201, 'Withdrawal request submitted', result);

  } catch (err) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return sendError(res, 400, 'Insufficient available balance');
    }
    if (err.message?.startsWith('BELOW_MINIMUM')) {
      const min = err.message.split(':')[1] || MIN_WITHDRAWAL_THB;
      return sendError(res, 400, `Minimum withdrawal is ฿${min}`);
    }
    console.error('[createWithdrawal]', err);
    return sendError(res, 500, 'Failed to create withdrawal request');
  }
};

// ════════════════════════════════════════════════════════════════
//  GET /api/wallet/withdrawals
//  List all withdrawal requests for this seller.
// ════════════════════════════════════════════════════════════════
const listMyWithdrawals = async (req, res) => {
  try {
    const withdrawals = await getMyWithdrawals(req.user.uid, {
      limit: Math.min(parseInt(req.query.limit) || 20, 100),
    });
    return sendSuccess(res, 200, 'Withdrawals fetched', {
      withdrawals,
      count: withdrawals.length,
    });
  } catch (err) {
    console.error('[listMyWithdrawals]', err);
    return sendError(res, 500, 'Failed to fetch withdrawals');
  }
};

// ════════════════════════════════════════════════════════════════
//  DELETE /api/wallet/withdrawals/:id
//  Cancel a pending withdrawal request (seller only).
// ════════════════════════════════════════════════════════════════
const cancelMyWithdrawal = async (req, res) => {
  try {
    await cancelWithdrawal(req.params.id, req.user.uid);
    console.log(`[DELETE /wallet/withdrawals/${req.params.id}] Cancelled by ${req.user.uid}`);
    return sendSuccess(res, 200, 'Withdrawal cancelled', { withdrawalId: req.params.id });
  } catch (err) {
    if (err.message === 'WITHDRAWAL_NOT_FOUND') return sendError(res, 404, 'Withdrawal not found');
    if (err.message === 'FORBIDDEN')            return sendError(res, 403, 'Access denied');
    if (err.message === 'CANNOT_CANCEL')        return sendError(res, 409, 'Only pending withdrawals can be cancelled');
    console.error('[cancelMyWithdrawal]', err);
    return sendError(res, 500, 'Failed to cancel withdrawal');
  }
};

module.exports = {
  getMyWallet,
  getMyTransactions,
  createWithdrawal,
  listMyWithdrawals,
  cancelMyWithdrawal,
};