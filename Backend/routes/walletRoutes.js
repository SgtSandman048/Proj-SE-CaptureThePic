// routes/walletRoutes.js

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();

const {
  getMyWallet,
  getMyTransactions,
  createWithdrawal,
  listMyWithdrawals,
  cancelMyWithdrawal,
} = require('../controllers/walletController');

const { authenticate }  = require('../middleware/authMiddleware');
const { requireUser }   = require('../middleware/roleMiddleware');

// All wallet routes require a valid authenticated user
router.use(authenticate, requireUser);

// ── Validators ───────────────────────────────────────────────
const withdrawalValidators = [
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 100 }).withMessage('Minimum withdrawal is ฿100'),
  body('bankName')
    .trim().notEmpty().withMessage('bankName is required')
    .isLength({ max: 60 }).withMessage('bankName too long'),
  body('accountNumber')
    .trim().notEmpty().withMessage('accountNumber is required')
    .matches(/^[\d\-]+$/).withMessage('accountNumber must contain only digits and dashes')
    .isLength({ min: 10, max: 20 }).withMessage('accountNumber must be 10–20 characters'),
  body('accountName')
    .trim().notEmpty().withMessage('accountName is required')
    .isLength({ max: 100 }).withMessage('accountName too long'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('note must be under 300 characters'),
];

// ════════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════════

// GET  /api/wallet                  — current balance + totals
router.get('/', getMyWallet);

// GET  /api/wallet/transactions     — paginated transaction history
router.get('/transactions', getMyTransactions);

// GET  /api/wallet/withdrawals      — all my withdrawal requests
router.get('/withdrawals', listMyWithdrawals);

// POST /api/wallet/withdraw         — create withdrawal request
router.post('/withdraw', withdrawalValidators, createWithdrawal);

// DELETE /api/wallet/withdrawals/:id — cancel pending withdrawal
router.delete('/withdrawals/:id', cancelMyWithdrawal);

module.exports = router;