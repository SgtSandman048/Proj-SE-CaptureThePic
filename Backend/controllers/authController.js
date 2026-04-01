// controllers/authController.js

// Reminder: If you want use some API that disabled, Remove /* */.

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

//const redisClient = require('../config/redis');
const { createUserDocument, sanitizeUser, ROLES } = require('../models/userModel');
const { createUser, getUserById, getUserByEmail, isUsernameTaken, updateUser, updateLastLogin, } = require('../services/userService');
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../services/jwtService');
const { blacklistToken } = require('../services/jwtBlacklistService');
const { sendSuccess, sendError } = require('../utils/apiResponse');
//const logger = require('../utils/logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;


//  POST /api/auth/register
const register = async (req, res) => {
  try {
    // 1. Validate request body via express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }

    const { username, email, pass, role } = req.body;

    // 2. Validate role — only 'user' are self-registrable
    const allowedRoles = [ROLES.USER];
    if (!allowedRoles.includes(role)) {
      return sendError(res, 400, `Role must be one of: ${allowedRoles.join(', ')}`);
    }

    // 3. Check for duplicate email
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists');  // Your email is already taken.
    }

    // 4. Check for duplicate username
    const usernameTaken = await isUsernameTaken(username);
    if (usernameTaken) {
      return sendError(res, 409, 'Username is already taken');    // Your username is already taken.
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(pass, SALT_ROUNDS);

    // 6. Create Firebase Auth user (for UID generation)
    const { auth } = require('../config/firebase');
    let firebaseUser;
    try {
      firebaseUser = await auth().createUser({
        email: email.toLowerCase().trim(),
        password: pass,            // Firebase Auth also keeps its own credential
        displayName: username,
        disabled: false,
      });
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        return sendError(res, 409, 'An account with this email already exists');
      }
      throw firebaseError;
    }

    // 7. Build & store user document in Firestore
    const userDoc = createUserDocument(
      firebaseUser.uid,
      username,
      email,
      role,
      hashedPassword
    );
    await createUser(firebaseUser.uid, userDoc);

    //logger.info(`✅ New user registered: ${firebaseUser.uid} (${role})`);
    console.log(`[!] User ${username} (${role}) has registered successfully`);

    // 8. Respond — do NOT include tokens on register (force explicit login)
    return sendSuccess(res, 201, 'User registered successfully', {
      userId: firebaseUser.uid,
    });
  } catch (error) {
    //logger.error('Register error:', error);
    //console.log("Someone trying to register but failed unfortunately :(")
    return sendError(res, 500, 'Registration failed. Please try again.');
  }
};


//  POST /api/auth/login
const login = async (req, res) => {
  try {
    // 1. Validate
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }

    const { email, pass } = req.body;

    // 2. Find user in Firestore (contains hashed password)
    const user = await getUserByEmail(email);
    if (!user) {
      // Use generic message to prevent email enumeration
      return sendError(res, 401, 'Invalid email or password');
    }

    // 3. Check account is active
    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been suspended. Please contact support.');
    }

    // 4. Compare passwords
    const passwordMatch = await bcrypt.compare(pass, user.hashedPassword);
    if (!passwordMatch) {
      //logger.warn(`Failed login attempt for: ${email}`);
      return sendError(res, 401, 'Invalid email or password');
    }

    // 5. Generate tokens
    const tokenPayload = {
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 6. Update last login timestamp (fire-and-forget)
    updateLastLogin(user.uid).catch((e) => logger.error('lastLogin update error:', e));

    //logger.info(`✅ User logged in: ${user.uid}`);
    console.log(`[!] User ${user.username} (${user.role}) has logged in to server`);

    // 7. Send refresh token in httpOnly cookie (XSS-safe)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    });

    // 8. Return access token + safe user info
    return sendSuccess(res, 200, 'Login successful', {
      token: accessToken,
      user: {
        userId: user.uid,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    //logger.error('Login error:', error);
    return sendError(res, 500, 'Login failed. Please try again.', error);
  }
};


//  POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return sendError(res, 401, 'Refresh token not provided');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return sendError(res, 401, 'Invalid or expired refresh token');
    }

    // Fetch fresh user data
    const user = await getUserById(decoded.uid);
    if (!user || !user.isActive) {
      return sendError(res, 401, 'User not found or account suspended');
    }

    // Issue new access token
    const newAccessToken = generateAccessToken({
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return sendSuccess(res, 200, 'Token refreshed', { token: newAccessToken });
  } catch (error) {
    //logger.error('Refresh token error:', error);
    return sendError(res, 500, 'Token refresh failed');
  }
};


//  POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);

      // decoded.jti  — unique token ID (added in jwtService.js)
      // decoded.exp  — expiry timestamp (Unix seconds)
      if (decoded.jti && decoded.exp) {
        blacklistToken(decoded.jti, decoded.exp);
      }
    }

    // Clear httpOnly refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });


    //logger.info(`User logged out: ${req.user?.uid}`);
    console.log(`[!] User ${req.user.username} (${req.user.role}) has logged out from server`);
    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    //logger.error('Logout error:', error);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return sendSuccess(res, 500, 'Logged out but not fully successfully');
  }
};


//  GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.uid);
    console.log(`[!] User ${user.username} (${user.role}) has called their profile`);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    return sendSuccess(res, 200, 'User profile fetched', sanitizeUser(user));
  } catch (error) {
    //logger.error('getMe error:', error);
    return sendError(res, 500, 'Failed to fetch user profile');
  }
};

//  PATCH /api/auth/me
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }
 
    const { username, bio, location } = req.body;
    const updates = {};
 
    // Username change — check for conflicts
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) return sendError(res, 400, 'Username cannot be empty');
      if (trimmed.length < 3 || trimmed.length > 30) {
        return sendError(res, 400, 'Username must be 3–30 characters');
      }
      // Only check conflict if actually changing
      const currentUser = await getUserById(req.user.uid);
      if (trimmed !== currentUser.username) {
        const taken = await isUsernameTaken(trimmed);
        if (taken) return sendError(res, 409, 'Username is already taken');
      }
      updates.username = trimmed;
    }
 
    if (bio      !== undefined) updates.bio      = bio.trim().slice(0, 500);
    if (location !== undefined) updates.location = location.trim().slice(0, 100);
 
    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'No fields to update');
    }
 
    await updateUser(req.user.uid, updates);
 
    const fresh = await getUserById(req.user.uid);
    console.log(`[PATCH /auth/me] Updated profile: ${req.user.uid}`);
 
    return sendSuccess(res, 200, 'Profile updated successfully', sanitizeUser(fresh));
  } catch (error) {
    console.error('[updateProfile]', error);
    return sendError(res, 500, 'Failed to update profile');
  }
};

//  PATCH /api/auth/me/avatar
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file provided. Send a multipart field named "avatarFile".');
    }
 
    const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');
 
    // Upload new avatar to Cloudinary (public — it's a profile picture)
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:   'imagery/avatars',
          public_id: `avatar_${req.user.uid}`,  // deterministic ID → auto-replaces old version
          overwrite: true,
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' }, // square crop, face-aware
            { quality: 'auto:good', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
 
    const profileImageUrl = uploadResult.secure_url;
 
    // Delete old avatar from Cloudinary if it was different (overwrite=true handles same ID,
    // but if user previously had a different public_id we clean it up)
    const currentUser = await getUserById(req.user.uid);
    if (
      currentUser.profileImagePublicId &&
      currentUser.profileImagePublicId !== uploadResult.public_id
    ) {
      deleteCloudinaryImage(currentUser.profileImagePublicId).catch(() => {});
    }
 
    await updateUser(req.user.uid, {
      profileImage:          profileImageUrl,
      profileImagePublicId:  uploadResult.public_id,
    });
 
    console.log(`[PATCH /auth/me/avatar] Avatar updated: ${req.user.uid}`);
    return sendSuccess(res, 200, 'Profile picture updated', { profileImage: profileImageUrl });
  } catch (error) {
    console.error('[updateAvatar]', error);
    return sendError(res, 500, 'Failed to update profile picture');
  }
};

/*
//  POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    // Fetch full user doc (includes hashedPassword)
    const user = await getUserById(req.user.uid);
    if (!user) return sendError(res, 404, 'User not found');

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!match) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    // Hash & update
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await updateUser(req.user.uid, { hashedPassword: newHash });

    // Also update Firebase Auth password
    const { auth } = require('../config/firebase');
    await auth().updateUser(req.user.uid, { password: newPassword });

    logger.info(`Password changed for user: ${req.user.uid}`);
    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    logger.error('changePassword error:', error);
    return sendError(res, 500, 'Password change failed');
  }
};*/

//  GET /auth/users/:uid  — public profile
const getPublicProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return sendError(res, 400, 'User ID is required');
    const user = await getUserById(uid);
    if (!user || !user.isActive) return sendError(res, 404, 'User not found');
    const { publicProfile } = require('../models/userModel');
    return sendSuccess(res, 200, 'Public profile fetched', publicProfile(user));
  } catch (error) {
    console.error('[getPublicProfile]', error);
    return sendError(res, 500, 'Failed to fetch public profile');
  }
};

module.exports = { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getMe,
  updateProfile,
  updateAvatar, 
  //changePassword, 
  getPublicProfile,
};