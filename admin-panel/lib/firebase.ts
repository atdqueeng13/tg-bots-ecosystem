import admin from 'firebase-admin';

function getFirebaseCredentials() {
  // Option A: Raw JSON string in FIREBASE_SERVICE_ACCOUNT_KEY
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return admin.credential.cert(parsed);
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  // Option B: Individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  return null;
}

export function initFirebase() {
  if (!admin.apps.length) {
    const credential = getFirebaseCredentials();
    if (credential) {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('🔥 Firebase Admin SDK initialized successfully!');
    }
  }
  return admin;
}

export const firestore = () => {
  initFirebase();
  if (admin.apps.length) {
    return admin.firestore();
  }
  return null;
};
