import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../firebase.js';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file MIME type and file size (max 5 MB, JPEG/PNG/WebP).
 */
export function validateProfileImage(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file was selected.' };
  }

  // Type check
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  // Size check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size is ${sizeInMb} MB. The maximum allowed profile picture size is 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generates a default avatar URL using DiceBear based on user UID / name.
 */
export function getDefaultAvatar(seed: string): string {
  const cleanSeed = encodeURIComponent(seed.trim() || 'metachat');
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanSeed}`;
}

export class StorageService {
  /**
   * Uploads an authenticated user's profile photo to Firebase Storage under `profile_photos/{uid}/`.
   * Returns the secure public HTTPS download URL.
   */
  static async uploadProfilePhoto(
    uid: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    if (!uid) {
      throw new Error('User UID is required to upload a profile photo.');
    }

    const validation = validateProfileImage(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file.');
    }

    // Determine extension
    let ext = 'jpg';
    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/webp') ext = 'webp';

    const timestamp = Date.now();
    const storagePath = `profile_photos/${uid}/avatar_${timestamp}.${ext}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        ownerUid: uid,
        uploadedAt: new Date().toISOString(),
      },
    };

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(percent);
          }
        },
        (error) => {
          console.error('[Firebase Storage] Upload error:', error);
          if (error.code === 'storage/unauthorized') {
            reject(new Error('Permission denied. You can only update your own profile photo.'));
          } else if (error.code === 'storage/quota-exceeded') {
            reject(new Error('Storage quota exceeded on Firebase project.'));
          } else if (error.code === 'storage/canceled') {
            reject(new Error('Image upload was cancelled.'));
          } else {
            reject(new Error(error.message || 'Failed to upload photo to Firebase Storage.'));
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err: any) {
            reject(new Error(err.message || 'Could not retrieve download URL for uploaded photo.'));
          }
        }
      );
    });
  }

  /**
   * Removes an existing profile photo from Firebase Storage if it's stored there.
   */
  static async removeProfilePhoto(photoUrl: string): Promise<void> {
    if (!photoUrl || !photoUrl.includes('firebasestorage.googleapis.com')) {
      // Not a Firebase Storage URL (e.g. DiceBear default), nothing to delete in bucket
      return;
    }

    try {
      const fileRef = ref(storage, photoUrl);
      await deleteObject(fileRef);
    } catch (err: any) {
      // If object doesn't exist anymore or cannot be deleted, log and continue gracefully
      console.warn('[Firebase Storage] removeProfilePhoto warning:', err.message);
    }
  }
}
