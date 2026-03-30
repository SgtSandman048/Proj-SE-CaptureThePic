// middlewares/banMiddleware.js

const { db } = require('../config/firebase');
const { sendError } = require('../utils/apiResponse');

const checkBan = async (req, res, next) => {
  try {
    if (!req.user?.uid) return sendError(res, 401, 'Not authenticated');
 
    const userDoc = await db().collection('users').doc(req.user.uid).get();
 
    if (!userDoc.exists) {
      return sendError(res, 401, 'Account not found');
    }
 
    const { isBanned, isDeleted, banReason } = userDoc.data();
 
    if (isDeleted) {
      return sendError(res, 403, 'This account has been permanently deleted');
    }
 
    if (isBanned) {
      return sendError(res, 403, `Account suspended: ${banReason || 'Contact support for more information'}`);
    }
 
    next();
  } catch (err) {
    console.error('[checkBan]', err);
    return sendError(res, 500, 'Auth check failed');
  }
};
 
module.exports = { checkBan };