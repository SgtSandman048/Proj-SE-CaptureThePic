// utils/priceCalculator.js

const PLATFORM_COMMISSION = 0.20;   // 20% platform fee taken from seller
const TAX_RATE = 0.07;              // 7% VAT (Thailand)
const MIN_PRICE = 10;               // THB
const MAX_PRICE = 100000;           // THB
const CURRENCY = 'THB';

const validatePrice = (price) => {
  const num = parseFloat(price);
  if (isNaN(num))          return { valid: false, reason: 'Price must be a number' };
  if (num < MIN_PRICE)     return { valid: false, reason: `Minimum price is ${MIN_PRICE} ${CURRENCY}` };
  if (num > MAX_PRICE)     return { valid: false, reason: `Maximum price is ${MAX_PRICE} ${CURRENCY}` };
  return { valid: true };
};

// Order: Total Price
const calculatePrice = (basePrice, { discountPercent = 0, includeVat = false } = {}) => {
  if (typeof basePrice !== 'number' || basePrice < 0) {
    throw new Error('Invalid base price');
  }

  const discount = Math.min(Math.max(discountPercent, 0), 100);
  let price = basePrice * (1 - discount / 100);

  if (includeVat) {
    price = price * (1 + TAX_RATE);
  }

  return Math.round(price * 100) / 100;
};

// Image: Buyer Price
const calculateBuyerTotal = (basePrice, discountPercent = 0) => {
  const discount = parseFloat(((basePrice * discountPercent) / 100).toFixed(2));
  const afterDiscount = parseFloat((basePrice - discount).toFixed(2));
  const tax = parseFloat((afterDiscount * TAX_RATE).toFixed(2));
  const total = parseFloat((afterDiscount + tax).toFixed(2));
  return { basePrice, discount, tax, total, currency: CURRENCY };
};

const calculateSellerNet = (salePrice) => {
  const commission = parseFloat((salePrice * PLATFORM_COMMISSION).toFixed(2));
  const sellerNet = parseFloat((salePrice - commission).toFixed(2));
  return { salePrice, commission, sellerNet, currency: CURRENCY };
};

module.exports = {
  validatePrice,
  calculatePrice,
  calculateBuyerTotal,
  calculateSellerNet,
  PLATFORM_COMMISSION,
  TAX_RATE,
  MIN_PRICE,
  MAX_PRICE,
};
