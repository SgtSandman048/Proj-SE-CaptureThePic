// models/walletModel.js

const { FieldValue } = require('../config/firebase');

// ── Platform fee config ────────────────────────────────────────
// Seller receives SELLER_SHARE of each sale. Platform keeps the rest.
const PLATFORM_FEE_RATE = 0.20;          // 20% platform cut
const SELLER_SHARE_RATE = 1 - PLATFORM_FEE_RATE; // 80% to seller

const TRANSACTION_TYPES = Object.freeze({
  SALE:       'sale',        // Seller earns from completed order
  WITHDRAWAL: 'withdrawal',  // Seller requests payout
  REFUND:     'refund',      // Partial reversal (future)
  ADJUSTMENT: 'adjustment',  // Admin manual correction
});

const WITHDRAWAL_STATUS = Object.freeze({
  PENDING:   'pending',    // Awaiting admin action
  APPROVED:  'approved',   // Admin sent the money
  REJECTED:  'rejected',   // Admin rejected
  CANCELLED: 'cancelled',  // Seller cancelled
});

// ── Minimum withdrawal amount (THB) ───────────────────────────
const MIN_WITHDRAWAL_THB = 100;

/**
 * Build a transaction document (stored in /transactions collection).
 * One document per sale or withdrawal event.
 */
const createTransactionDocument = ({
  sellerId,
  type,
  amount,          // positive = credit, negative = debit (withdrawal)
  platformFee = 0,
  orderId     = null,
  imageId     = null,
  imageName   = null,
  note        = '',
  balanceBefore,
  balanceAfter,
}) => ({
  sellerId,
  type,
  amount:        parseFloat(amount.toFixed(2)),
  platformFee:   parseFloat(platformFee.toFixed(2)),
  net:           parseFloat((amount - platformFee).toFixed(2)),
  orderId,
  imageId,
  imageName,
  note,
  balanceBefore: parseFloat(balanceBefore.toFixed(2)),
  balanceAfter:  parseFloat(balanceAfter.toFixed(2)),
  createdAt:     FieldValue.serverTimestamp(),
});

/**
 * Build a withdrawal request document (stored in /withdrawalRequests collection).
 */
const createWithdrawalDocument = ({
  sellerId,
  sellerName,
  amount,
  bankName,
  accountNumber,
  accountName,
  note = '',
}) => ({
  sellerId,
  sellerName,
  amount:        parseFloat(amount.toFixed(2)),
  bankName:      bankName.trim(),
  accountNumber: accountNumber.trim(),
  accountName:   accountName.trim(),
  note:          note.trim(),
  status:        WITHDRAWAL_STATUS.PENDING,
  adminNote:     null,
  processedBy:   null,
  processedAt:   null,
  createdAt:     FieldValue.serverTimestamp(),
  updatedAt:     FieldValue.serverTimestamp(),
});

/**
 * Calculate seller payout for a given sale price.
 * @param {number} salePrice  — the totalAmount from the order
 * @returns {{ gross, platformFee, net }}
 */
const calculateSellerPayout = (salePrice) => {
  const gross       = parseFloat(salePrice);
  const platformFee = parseFloat((gross * PLATFORM_FEE_RATE).toFixed(2));
  const net         = parseFloat((gross - platformFee).toFixed(2));
  return { gross, platformFee, net };
};

module.exports = {
  PLATFORM_FEE_RATE,
  SELLER_SHARE_RATE,
  TRANSACTION_TYPES,
  WITHDRAWAL_STATUS,
  MIN_WITHDRAWAL_THB,
  createTransactionDocument,
  createWithdrawalDocument,
  calculateSellerPayout,
};