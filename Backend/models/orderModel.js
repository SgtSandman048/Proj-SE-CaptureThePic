/**
 * Order Model
 *
 * Represents the shape of an order document stored in Firestore.
 * Use these helpers to build and validate order data consistently.
 *
 * Firestore collection: "orders"
 * Document ID: auto-generated
 */

/**
 * @typedef {Object} Order
 * @property {string}      userId      - Firebase UID of the buyer
 * @property {string}      imageId     - Firestore document ID of the purchased image
 * @property {string}      imageName   - Denormalised image name (for quick list display)
 * @property {number}      totalAmount - Final price paid
 * @property {OrderStatus} status      - Current order status
 * @property {string|null} slipUrl     - Cloudinary URL of uploaded payment slip
 * @property {string}      createdAt   - ISO 8601 creation timestamp
 * @property {string}      updatedAt   - ISO 8601 last-update timestamp
 */

/**
 * @typedef {'pending'|'checking'|'completed'|'rejected'} OrderStatus
 *
 * Status flow:
 *   pending → checking → completed
 *                      ↘ rejected
 */

const ORDER_STATUSES = ['pending', 'checking', 'completed', 'rejected'];

/**
 * Build a new order payload ready to be written to Firestore.
 */
const buildOrder = ({ userId, imageId, imageName, totalAmount }) => {
  const now = new Date().toISOString();
  return {
    userId,
    imageId,
    imageName,
    totalAmount,
    status: 'pending',
    slipUrl: null,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Validate that a status transition is legal.
 * @param {OrderStatus} from
 * @param {OrderStatus} to
 * @returns {boolean}
 */
const isValidTransition = (from, to) => {
  const allowed = {
    pending:   ['checking'],
    checking:  ['completed', 'rejected'],
    completed: [],
    rejected:  [],
  };
  return (allowed[from] || []).includes(to);
};

module.exports = { ORDER_STATUSES, buildOrder, isValidTransition };