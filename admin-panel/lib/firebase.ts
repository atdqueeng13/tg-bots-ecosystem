import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

function getFirebaseCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return cert(parsed);
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  return null;
}

let app: App | undefined;

export function initFirebase(): App | null {
  if (!getApps().length) {
    const credential = getFirebaseCredentials();
    if (credential) {
      app = initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('🔥 Firebase Admin SDK initialized successfully!');
    }
  } else {
    app = getApps()[0];
  }
  return app || null;
}

export const firestore = (): Firestore | null => {
  const initializedApp = initFirebase();
  if (initializedApp) {
    return getFirestore(initializedApp);
  }
  return null;
};
