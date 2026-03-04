// middlewares/roleMiddleware.js

const { sendError } = require('../utils/apiResponse');
const { ROLES } = require('../models/userModel');


const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Authentication required');
  }
  if (!roles.includes(req.user.role)) {
    return sendError(
      res,
      403,
      `Access denied. This action requires role: ${roles.join(' or ')}. Your role: ${req.user.role}`
    );
  }
  next();
};

// Pre-built convenience guards

// Admin Only
const requireAdmin = requireRole(ROLES.ADMIN);

// Logged in User Only
const requireUser = requireRole(ROLES.USER, ROLES.ADMIN);

// Image Owner Only
const requireOwnerOrAdmin = (ownerUidField = 'sellerId') => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Authentication required');
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  const isOwner = req.resource && req.resource[ownerUidField] === req.user.uid;

  if (!isAdmin && !isOwner) {
    return sendError(res, 403, 'Access denied. You do not own this resource.');
  }

  next();
};

module.exports = { requireRole, requireAdmin, requireUser, /*requireSeller, requireBuyer,*/ requireOwnerOrAdmin };