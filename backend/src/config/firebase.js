const admin = require('firebase-admin');

// Initialize Firebase Admin only if credentials are provided
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.log('⚠️ Firebase Admin initialization failed:', error.message);
  }
} else {
  console.log('⚠️ Firebase credentials not found - Push notifications disabled');
}

module.exports = admin;
