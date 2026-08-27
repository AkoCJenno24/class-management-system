/**
 * Firebase Storage service layer for avatar file management.
 * Handles upload, retrieval, and deletion of teacher profile avatars.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads an avatar image to Firebase Storage.
 * Files are stored at avatars/{uid}/avatar.{ext}
 * Returns the public download URL.
 */
export async function uploadAvatar(uid: string, file: Blob | File): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `avatars/${uid}/avatar_${timestamp}.jpg`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Gets the download URL for a user's avatar.
 * Returns null if no avatar exists.
 */
export async function getAvatarUrl(uid: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, `avatars/${uid}/avatar.png`);
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}

/**
 * Uploads a student profile avatar image to Firebase Storage.
 * Files are stored at avatars/{uid}/students/{studentKey}_{timestamp}.jpg
 * Returns the public download URL.
 */
export async function uploadStudentAvatar(
  uid: string,
  studentKey: string,
  file: Blob | File
): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `avatars/${uid}/students/${studentKey}_${timestamp}.jpg`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

