// routes/walletRoutes.js

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();

const {
  initializeMyWallet,
  getMyWallet,
  getMyTransactions,
  createWithdrawal,
  listMyWithdrawals,
  cancelMyWithdrawal,
} = require('../controllers/walletController');

const { authenticate }  = require('../middleware/authMiddleware');
const { requireUser }   = require('../middleware/roleMiddleware');
const { checkBan } = require('../middleware/banMiddleware');

// All wallet routes require a valid authenticated user
router.use(authenticate, checkBan, requireUser);

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


router.post('/initialize', initializeMyWallet);

router.get('/', getMyWallet);

router.get('/transactions', getMyTransactions);

router.get('/withdrawals', listMyWithdrawals);

router.post('/withdraw', withdrawalValidators, createWithdrawal);

router.delete('/withdrawals/:id', cancelMyWithdrawal);

module.exports = router;