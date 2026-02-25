// middlewares/authMiddleware.js

const { verifyAccessToken } = require('../services/jwtService');
const { getUserById } = require('../services/userService');
const { sendError } = require('../utils/apiResponse');
//const logger = require('../utils/logger');


// Authenticate
const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization; 
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authorization token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 401, 'Token not provided');
    }

    // 2. Verify token signature & expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Token has expired. Please log in again.');
      }
      if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'Invalid token');
      }
      throw err;
    }

    // 3. Fetch fresh user from Firestore to ensure account is still active
    //    (Cached in a 60-second window to reduce DB reads on high-traffic routes)
    const user = await getUserById(decoded.uid);
    if (!user) {
      return sendError(res, 401, 'User account not found');
    }
    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been suspended');
    }

    // 4. Attach lightweight user object to request
    req.user = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    //logger.error('Authentication middleware error:', error);
    console.error('Authentication Middleware Error');
    return sendError(res, 500, 'Authentication error');
  }
};

// Optional Authenticate
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await getUserById(decoded.uid);

    req.user = user?.isActive
      ? { uid: user.uid, email: user.email, username: user.username, role: user.role }
      : null;
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate };