// services/jwtService.js
// JWT token generation, verification, and refresh logic

const jwt = require('jsonwebtoken');
//const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;  // Need some enhancement due to how dumb of current env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const { v4: uuidv4 } = require('uuid');

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  //logger.error('❌ JWT secrets are not set in environment variables');
  console.error('[Error] 401: Failed to call JWT service');
  process.exit(1);
}

// Generate access token with user payload
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
      jti: uuidv4(),
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'image-store-api',
      audience: 'image-store-client',
    }
  );
};

// Generate long-lived refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { uid: user.uid },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'image-store-api',
    }
  );
};

// Verify an access token
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'image-store-api',
    audience: 'image-store-client',
  });
};

// Verify a refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: 'image-store-api' });
};

// Decode token WITHOUT verifying (useful for logging, not auth)
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};