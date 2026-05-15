import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * Can be configured via FIREBASE_SERVICE_ACCOUNT (JSON string)
 * or individual fields (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)
 */

let firebaseApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'jhumroo');
    console.log('Firebase Admin initialized via service account JSON');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'jhumroo');
    console.log('Firebase Admin initialized via environment variables');
  } else {
    console.warn('Firebase configuration missing. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
}

const messaging = firebaseApp ? admin.messaging(firebaseApp) : null;

export { admin, messaging };
