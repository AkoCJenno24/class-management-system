/**
 * Firebase Authentication service layer.
 * Supports email/password and Google Sign-In.
 * All auth operations are abstracted here — UI components never call Firebase Auth directly.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from './config';

/** Google Auth provider instance (reusable) */
const googleProvider = new GoogleAuthProvider();

/**
 * Creates a new user account with email and password.
 * Returns the Firebase User object on success.
 */
export async function signUp(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Signs in an existing user with email and password.
 * Returns the Firebase User object on success.
 */
export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Signs in with Google using a popup window.
 * Creates a new account if one doesn't exist.
 * Returns the Firebase User object.
 */
export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

/** Signs out the current user. */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribes to auth state changes. Fires immediately with the current user
 * (or null if not signed in), then fires again whenever auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/** Sends a password reset email to the specified address. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Used by auth UI components for toast notifications.
 */
export function getAuthErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Only one sign-in popup can be open at a time.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site.',
  };
  return messages[errorCode] || 'An unexpected error occurred. Please try again.';
}
