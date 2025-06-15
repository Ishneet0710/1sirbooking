
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your Firebase project settings:
// Project settings > General > Your apps > Web app > Firebase SDK snippet > Config
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCb9Wi3rFfvGeLTCHGpjgTH2xMOj_FFmxY",
  authDomain: "venueflow-ky7eh.firebaseapp.com",
  projectId: "venueflow-ky7eh",
  storageBucket: "venueflow-ky7eh.firebasestorage.app",
  messagingSenderId: "859453489861",
  appId: "1:859453489861:web:1e7f2b903ef3ee5114a6ac"
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

export { db, app, auth, firebaseConfig }; // Export firebaseConfig as well
