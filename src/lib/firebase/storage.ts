/**
 * Firebase Storage service layer for avatar file management.
 * Handles upload, retrieval, and deletion of teacher profile avatars.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads an avatar image to Firebase Storage.
 * Files are stored at avatars/{uid}/avatar.{ext}
 * Returns the public download URL.
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'png';
  const storageRef = ref(storage, `avatars/${uid}/avatar.${extension}`);
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

/** Deletes the user's avatar from Storage. */
export async function deleteAvatar(uid: string): Promise<void> {
  try {
    const storageRef = ref(storage, `avatars/${uid}/avatar.png`);
    await deleteObject(storageRef);
  } catch {
    // Avatar may not exist — that's fine
  }
}
