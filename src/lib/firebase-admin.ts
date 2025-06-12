
import admin from 'firebase-admin';

// Your Firebase project's service account credentials should be set as an environment variable
// (GOOGLE_APPLICATION_CREDENTIALS) or Firebase Admin SDK will automatically discover them
// when running in a Firebase environment (e.g. Cloud Functions, App Hosting).
// If running locally outside of these environments, you might need to set this variable.
// Example:
// if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//  const serviceAccount = require("./path/to/your/serviceAccountKey.json");
//  admin.initializeApp({
//    credential: admin.credential.cert(serviceAccount)
//  });
// } else {
//   admin.initializeApp();
// }

if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
