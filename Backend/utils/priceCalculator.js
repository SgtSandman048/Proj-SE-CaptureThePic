/**
 * Price calculation helpers.
 * Centralising price logic here makes it easy to add tax, coupons, or
 * tiered pricing without touching service/controller files.
 */

const VAT_RATE = 0.07; // 7% VAT

/**
 * Calculate the final price for an order.
 * @param {number} basePrice - Raw image price in THB (stored in Firestore)
 * @param {object} options
 * @param {number} [options.discountPercent=0] - Discount percentage (0–100)
 * @param {boolean} [options.includeVat=false]  - Whether to add VAT on top
 * @returns {number} Final amount rounded to 2 decimal places
 */
const calculatePrice = (basePrice, { discountPercent = 0, includeVat = false } = {}) => {
  if (typeof basePrice !== 'number' || basePrice < 0) {
    throw new Error('Invalid base price');
  }

  const discount = Math.min(Math.max(discountPercent, 0), 100);
  let price = basePrice * (1 - discount / 100);

  if (includeVat) {
    price = price * (1 + VAT_RATE);
  }

  return Math.round(price * 100) / 100;
};

module.exports = { calculatePrice, VAT_RATE };