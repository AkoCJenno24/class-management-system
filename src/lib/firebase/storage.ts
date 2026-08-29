/**
 * Firebase Storage service layer for avatar and document file management.
 * Handles upload, retrieval, and deletion of teacher profile avatars and documents.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/** Maximum document file size supported: 25 MB */
export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024;

/** Chunk size for large documents stored in Firestore: 500 KB */
export const CHUNK_STRING_SIZE = 500 * 1024;

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

/**
 * Uploads a school / institution logo image to Firebase Storage.
 * Files are stored at avatars/{uid}/school_logo_{timestamp}.jpg
 * Returns the public download URL.
 */
export async function uploadSchoolLogo(uid: string, file: Blob | File): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `avatars/${uid}/school_logo_${timestamp}.jpg`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ─── Documents / Files Storage (Google Drive Feature) ────────────────────────

export interface UploadDocumentResult {
  downloadUrl: string;
  storagePath: string;
  size: number;
  mimeType: string;
  fileExtension: string;
  storageType: 'storage' | 'firestore';
  dataUrl?: string;
  chunks?: string[];
}

/**
 * Reads a File object from device memory as a base64 Data URL.
 */
function readFileAsDataURL(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 40);
        onProgress(pct);
      }
    };

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from your device. Please try again.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a document or file with dual-tier resilience:
 * 1. Tries Firebase Storage with a 3.5s timeout.
 * 2. If Firebase Storage is unavailable (e.g. bucket 404, unauthorized, or offline),
 *    seamlessly falls back to Firestore document/chunk storage.
 * 3. Never hangs; reports smooth real-time progress.
 */
export async function uploadDocumentFile(
  uid: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<UploadDocumentResult> {
  // Validate file size
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" exceeds the 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
    );
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `documents/${uid}/${timestamp}_${safeName}`;
  const extParts = file.name.split('.');
  const fileExtension = extParts.length > 1 ? extParts.pop()?.toLowerCase() || '' : '';

  const KNOWN_MIME_TYPES: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    odt: 'application/vnd.oasis.opendocument.text',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    odp: 'application/vnd.oasis.opendocument.presentation',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
  };

  const mimeType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : (KNOWN_MIME_TYPES[fileExtension] || file.type || 'application/octet-stream');

  if (onProgress) onProgress(10);

  // Attempt Tier 1: Firebase Storage (with strict 3.5s timeout to prevent hanging)
  try {
    const storageRef = ref(storage, storagePath);
    const uploadPromise = uploadBytes(storageRef, file, { contentType: mimeType });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 3500);
    });

    if (onProgress) onProgress(30);

    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    if (onProgress) onProgress(80);

    const downloadUrl = await getDownloadURL(snapshot.ref);
    if (onProgress) onProgress(100);

    return {
      downloadUrl,
      storagePath,
      size: file.size,
      mimeType,
      fileExtension,
      storageType: 'storage',
    };
  } catch (storageErr) {
    console.warn(
      'Firebase Cloud Storage unavailable, falling back to resilient Firestore storage:',
      storageErr
    );
  }

  // Tier 2: Resilient Firestore File Storage
  // Read file data URL into memory
  if (onProgress) onProgress(35);
  const dataUrl = await readFileAsDataURL(file, (readPct) => {
    if (onProgress) onProgress(15 + Math.round(readPct * 0.4));
  });

  if (onProgress) onProgress(65);

  // If small file (<= 750 KB), store dataUrl inline
  if (file.size <= 750 * 1024) {
    if (onProgress) onProgress(100);
    return {
      downloadUrl: dataUrl,
      storagePath: '',
      size: file.size,
      mimeType,
      fileExtension,
      storageType: 'firestore',
      dataUrl,
    };
  }

  // If larger file (> 750 KB), split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < dataUrl.length; i += CHUNK_STRING_SIZE) {
    chunks.push(dataUrl.slice(i, i + CHUNK_STRING_SIZE));
  }

  if (onProgress) onProgress(75);

  return {
    downloadUrl: '',
    storagePath: '',
    size: file.size,
    mimeType,
    fileExtension,
    storageType: 'firestore',
    chunks,
  };
}

/**
 * Deletes a document file from Firebase Storage.
 */
export async function deleteDocumentFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    // Silently ignore 404 / non-existent storage objects
    console.warn('Storage delete info:', storagePath, err);
  }
}
