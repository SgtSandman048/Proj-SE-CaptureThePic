// config/firebase.js

const admin = require('firebase-admin');
//const logger = require('../utils/logger');

let db = null;
let auth = null;

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    // Already initialized? Return
    db = admin.firestore();
    auth = admin.auth();
    return { db, auth };
  }

  try {

    const serviceAccount = require('../serviceAccountKey.json'); // DO NOT CHANGE THIS NAME FILE.

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();
    auth = admin.auth();

    // Firestore settings
    db.settings({ ignoreUndefinedProperties: true });

    console.log("[!] Connected to Firebase Database");
    //logger.info('✅ Firebase Admin SDK initialized successfully');
    return { db, auth };
  } catch (error) {
    //logger.error('❌ Firebase initialization failed:', error.message);
    console.error("[Error] 503: Cannot connect to Firebase Database\n", error.message);
    process.exit(1);
  }
};

// Initialize on module load
initializeFirebase();

module.exports = {
  admin,
  db: () => admin.firestore(),        // lazy getter — always fresh reference
  auth: () => admin.auth(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};