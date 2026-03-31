// models/userModel.js

const { FieldValue, Timestamp } = require('../config/firebase');

const ROLES = Object.freeze({
  //BUYER: 'buyer',
  //SELLER: 'seller',
  USER: 'user',
  ADMIN: 'admin',
});

const createUserDocument = (uid, username, email, role, hashedPassword) => ({
  uid,
  username: username.trim(),
  email: email.toLowerCase().trim(),
  role,
  hashedPassword, 
  isActive: true,
  isEmailVerified: false,
  profileImage: null,
  profileImagePublicId: null,
  bio: null,
  location: null,

  // Seller-specific fields (null for buyers)
  sellerProfile: role === ROLES.USER ? {
    totalSales: 0,
    totalRevenue: 0,
    rating: 0,
    ratingCount: 0,
    bankAccount: null,
    payoutMethod: null,
  } : null,

  // Buyer-specific fields
  purchasedImages: [],
  wishlist: [],

  // Wallet (sellers only — initialised for all, only meaningful for sellers)
  sellerBalance:        0,
  sellerTotalEarned:    0,
  sellerTotalWithdrawn: 0,

  // Timestamps
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  lastLoginAt: null,
});


const sanitizeUser = (userDoc) => {
  const { hashedPassword, ...safeUser } = userDoc;
  return safeUser;
};


const publicProfile = (userDoc) => ({
  uid: userDoc.uid,
  username: userDoc.username,
  role: userDoc.role,
  profileImage: userDoc.profileImage,
  bio: userDoc.bio,
  location: userDoc.location || null,
  sellerProfile: userDoc.sellerProfile
    ? {
        totalSales: userDoc.sellerProfile.totalSales,
        rating: userDoc.sellerProfile.rating,
        ratingCount: userDoc.sellerProfile.ratingCount,
      }
    : null,
  createdAt: userDoc.createdAt,
});

module.exports = { ROLES, createUserDocument, sanitizeUser, publicProfile };
