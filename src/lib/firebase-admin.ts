
import admin from 'firebase-admin';
import { firebaseConfig } from './firebase'; // Import firebaseConfig

if (!admin.apps.length) {
  // Try to initialize with explicitly provided projectId if available,
  // especially for environments where auto-discovery might fail (like local dev for Admin SDK).
  // The Admin SDK will still try to find credentials via GOOGLE_APPLICATION_CREDENTIALS or ADC.
  admin.initializeApp({
    // The credential can often be inferred from the environment (e.g., GOOGLE_APPLICATION_CREDENTIALS).
    // If you are running in an environment without GOOGLE_APPLICATION_CREDENTIALS set,
    // and not on GCP, this will fail unless you explicitly provide a service account.
    // The current error is about *project ID*, so providing it explicitly helps.
    // For authentication (like verifyIdToken), projectId is crucial.
    projectId: firebaseConfig.projectId,
  });
}

export { admin };
