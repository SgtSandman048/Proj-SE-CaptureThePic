
const admin = require('firebase-admin');

let db = null;
let auth = null;

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    return { db, auth };
  }

  try {

    const serviceAccount = require('../serviceAccountKey.json'); 

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();
    auth = admin.auth();

    db.settings({ ignoreUndefinedProperties: true });

    console.log("[!] Connected to Firebase Database");
    return { db, auth };
  } catch (error) {
    console.error("[Error] 503: Cannot connect to Firebase Database\n", error.message);
    process.exit(1);
  }
};

initializeFirebase();

module.exports = {
  admin,
  db: () => admin.firestore(), 
  auth: () => admin.auth(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};