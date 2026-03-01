// routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const router = express.Router();

// Reminder: If you want use some API that disabled, Remove //.
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  //changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Login Limitation
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validator
const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('pass')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('role')
    .isIn([/*'buyer', 'seller',*/ 'user'])
    .withMessage('Role must be either "user"'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('pass').notEmpty().withMessage('Password is required'),
];

// Remove /**/ If you want to use this API.
/*
const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];*/


// Reminder: If you want use some API that disabled, Remove //.
router.post('/register', authLimiter, registerValidators, register);

router.post('/login', authLimiter, loginValidators, login);

router.post('/refresh-token', refreshToken);

router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getMe);

//router.post('/change-password', authenticate, changePasswordValidators, changePassword);

module.exports = router;