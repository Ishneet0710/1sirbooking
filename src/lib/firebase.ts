
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your Firebase project settings:
// Project settings > General > Your apps > Web app > Firebase SDK snippet > Config
// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_ACTUAL_API_KEY", // From your Firebase console
  authDomain: "YOUR_ACTUAL_PROJECT_ID.firebaseapp.com", // From your Firebase console
  projectId: "YOUR_ACTUAL_PROJECT_ID", // From your Firebase console
  storageBucket: "YOUR_ACTUAL_PROJECT_ID.appspot.com", // From your Firebase console
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID", // From your Firebase console
  appId: "YOUR_ACTUAL_APP_ID", // From your Firebase console
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: if you use Google Analytics
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth and get a reference to the service

export { db, app, auth }; // Export auth
