// services/userService.js

const { db, FieldValue } = require('../config/firebase');
const { sanitizeUser } = require('../models/userModel');

const COLLECTION = 'users';

const createUser = async (uid, userDocument) => {
  await db().collection(COLLECTION).doc(uid).set(userDocument);
  return uid;
};

const getUserById = async (uid) => {
  const snap = await db().collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return { ...snap.data(), uid: snap.id };
};

const getUserByEmail = async (email) => {
  const snap = await db()
    .collection(COLLECTION)
    .where('email', '==', email.toLowerCase().trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...doc.data(), uid: doc.id };
};

const isUsernameTaken = async (username) => {
  const snap = await db()
    .collection(COLLECTION)
    .where('username', '==', username.trim())
    .limit(1)
    .get();
  return !snap.empty;
};

const updateUser = async (uid, fields) => {
  await db()
    .collection(COLLECTION)
    .doc(uid)
    .update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
};

const updateLastLogin = async (uid) => {
  await db()
    .collection(COLLECTION)
    .doc(uid)
    .update({ lastLoginAt: FieldValue.serverTimestamp() });
};

const deactivateUser = async (uid) => {
  await db().collection(COLLECTION).doc(uid).update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
};

const getAllUsers = async ({ limit = 20, startAfter = null, role = null } = {}) => {
  let query = db().collection(COLLECTION).orderBy('createdAt', 'desc').limit(limit);
  if (role) query = query.where('role', '==', role);
  if (startAfter) {
    const cursor = await db().collection(COLLECTION).doc(startAfter).get();
    query = query.startAfter(cursor);
  }
  const snap = await query.get();
  return snap.docs.map((d) => sanitizeUser({ ...d.data(), uid: d.id }));
};

const searchUsers = async (query) => {
  const q = query.toLowerCase().trim();
  const snap = await db()
    .collection(COLLECTION)
    .where('isActive', '==', true)
    .get();
  return snap.docs
    .map(d => sanitizeUser({ ...d.data(), uid: d.id }))
    .filter(u => u.username?.toLowerCase().includes(q))
    .slice(0, 10);
};

module.exports = {
  createUser, getUserById, getUserByEmail,
  isUsernameTaken, updateUser, updateLastLogin,
  deactivateUser, getAllUsers, searchUsers
};