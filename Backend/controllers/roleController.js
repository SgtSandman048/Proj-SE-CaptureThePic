// Uhhh I dont think this shit will be used anymore


/**
 * middlewares/roleMiddleware.js
 * ─────────────────────────────────────────────────────────
 * Role-Based Access Control (RBAC) middleware guards
 *
 * Usage (always place AFTER authenticate middleware):
 *
 *   router.post('/upload', authenticate, requireSeller, handler)
 *   router.delete('/:id', authenticate, requireOwnerOrAdmin, handler)
 *   router.get('/admin', authenticate, requireAdmin, handler)
 */
const { sendError } = require('../utils/apiResponse');
const { ROLES } = require('../models/userModel');

/**
 * requireRole(...roles)
 * Returns middleware allowing only users whose role is in the provided list.
 *
 * @param {...string} roles — e.g. requireRole('admin'), requireRole('seller', 'admin')
 */
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

// ── Pre-built convenience guards ───────────────────────────────────────────

/** Admin only */
const requireAdmin = requireRole(ROLES.ADMIN);

/** Seller or Admin — Admins can also upload/manage images */
const requireSeller = requireRole(ROLES.SELLER, ROLES.ADMIN);

/** Buyer or Admin */
const requireBuyer = requireRole(ROLES.BUYER, ROLES.ADMIN);

/**
 * requireOwnerOrAdmin
 * Allows access if the authenticated user is the resource owner OR an admin.
 *
 * Compares req.user.uid against a field on the resource object
 * that must be attached to req.resource by the controller before calling this.
 *
 * OR use with a paramName to compare against a route param directly.
 *
 * @param {string} ownerUidField — Field on req.resource that holds the owner UID
 *
 * Example (in controller):
 *   const image = await getImageById(req.params.id);
 *   req.resource = image;
 *   return requireOwnerOrAdmin('sellerId')(req, res, next);
 */
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

module.exports = { requireRole, requireAdmin, requireSeller, requireBuyer, requireOwnerOrAdmin };