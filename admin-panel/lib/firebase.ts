import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase, Database } from 'firebase-admin/database';

export const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://sherlock-ec772-default-rtdb.firebaseio.com';

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'sherlock-ec772';

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
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return cert({
      projectId: FIREBASE_PROJECT_ID,
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
    app = initializeApp({
      credential: credential || undefined,
      projectId: FIREBASE_PROJECT_ID,
      databaseURL: FIREBASE_DATABASE_URL,
    });
    console.log('🔥 Firebase Admin SDK initialized for project:', FIREBASE_PROJECT_ID);
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

export const realtimeDb = (): Database | null => {
  const initializedApp = initFirebase();
  if (initializedApp) {
    return getDatabase(initializedApp);
  }
  return null;
};

/**
 * Утилита прямой записи в Firebase Realtime Database по REST API
 */
export async function syncToFirebaseRTDB(_path: string, _data: any) {
  // Firebase disabled - using Supabase PostgreSQL directly
  return Promise.resolve();
}
