/**
 * Firebase app initialization and service exports.
 * This is the single entry point for all Firebase SDK access.
 * All other modules import Firebase services from here.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBrdQDB0bJv685VLxrOgj7o2t92BmWGiAQ",
  authDomain: "class-management-app-3fb5b.firebaseapp.com",
  projectId: "class-management-app-3fb5b",
  storageBucket: "class-management-app-3fb5b.firebasestorage.app",
  messagingSenderId: "167605479391",
  appId: "1:167605479391:web:4a581df00c911d420b866a",
  measurementId: "G-ZH8FLZLDQT",
};

/** Firebase app instance */
export const app = initializeApp(firebaseConfig);

/** Firebase Authentication instance */
export const auth = getAuth(app);

/** Cloud Firestore database instance */
export const db = getFirestore(app);

/** Firebase Storage instance */
export const storage = getStorage(app);
