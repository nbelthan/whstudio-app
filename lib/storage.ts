/**
 * Storage utilities for handling file uploads with Vercel Blob
 * Supports audio files, images, documents, and other submission attachments
 */

import { put, del, head, list } from '@vercel/blob';

// Environment variables validation
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_READ_WRITE_TOKEN) {
  console.warn('BLOB_READ_WRITE_TOKEN not configured - file uploads will be disabled');
}

export interface UploadOptions {
  folder?: string;
  contentType?: string;
  maxSizeBytes?: number;
  generateUniqueFilename?: boolean;
}

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
  size: number;
  uploadedAt: Date;
}

export interface FileMetadata {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  lastModified: Date;
}

// Supported file types and their MIME types
export const SUPPORTED_FILE_TYPES = {
  // Audio files (for voice recordings)
  audio: {
    'audio/wav': ['.wav'],
    'audio/mp3': ['.mp3'],
    'audio/mpeg': ['.mp3', '.mpeg'],
    'audio/ogg': ['.ogg'],
    'audio/webm': ['.webm'],
    'audio/m4a': ['.m4a'],
    'audio/aac': ['.aac']
  },
  // Image files (for visual submissions)
  image: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg']
  },
  // Document files (for text submissions)
  document: {
    'text/plain': ['.txt'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/markdown': ['.md'],
    'application/json': ['.json']
  },
  // Video files (for video submissions)
  video: {
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/ogg': ['.ogv'],
    'video/quicktime': ['.mov']
  }
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  audio: 25 * 1024 * 1024, // 25MB for audio files
  image: 10 * 1024 * 1024, // 10MB for images
  document: 5 * 1024 * 1024, // 5MB for documents
  video: 100 * 1024 * 1024, // 100MB for videos
  default: 25 * 1024 * 1024 // 25MB default
};

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadFile(
  file: File | Buffer | Uint8Array,
  filename: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob storage not configured');
    }

    const {
      folder = 'uploads',
      contentType,
      maxSizeBytes,
      generateUniqueFilename = true
    } = options;

    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length;
    const sizeLimit = maxSizeBytes || FILE_SIZE_LIMITS.default;

    if (fileSize > sizeLimit) {
      throw new Error(`File size (${formatFileSize(fileSize)}) exceeds limit (${formatFileSize(sizeLimit)})`);
    }

    // Generate unique filename if requested
    let finalFilename = filename;
    if (generateUniqueFilename) {
      const timestamp = Date.now();
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const extension = getFileExtension(filename);
      const baseName = filename.replace(extension, '');
      finalFilename = `${baseName}_${timestamp}_${randomSuffix}${extension}`;
    }

    // Create the blob pathname
    const pathname = `${folder}/${finalFilename}`;

    // Detect content type if not provided
    const finalContentType = contentType || detectContentType(filename) || 'application/octet-stream';

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: finalContentType,
      token: BLOB_READ_WRITE_TOKEN
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: finalContentType,
      contentDisposition: blob.contentDisposition || 'inline',
      size: fileSize,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload an audio file (specifically for voice recordings)
 */
export async function uploadAudioFile(
  audioFile: File | Buffer,
  filename: string,
  options: Omit<UploadOptions, 'folder' | 'maxSizeBytes'> = {}
): Promise<UploadResult> {
  const audioOptions: UploadOptions = {
    ...options,
    folder: 'audio-submissions',
    maxSizeBytes: FILE_SIZE_LIMITS.audio
  };

  // Validate audio file type
  const contentType = options.contentType || detectContentType(filename);
  if (contentType && !isAudioFile(contentType)) {
    throw new Error('Invalid audio file type');
  }

  return uploadFile(audioFile, filename, audioOptions);
}

/**
 * Upload an image file
 */
export async function uploadImageFile(
  imageFile: File | Buffer,
  filename: string,
  options: Omit<UploadOptions, 'folder' | 'maxSizeBytes'> = {}
): Promise<UploadResult> {
  const imageOptions: UploadOptions = {
    ...options,
    folder: 'image-submissions',
    maxSizeBytes: FILE_SIZE_LIMITS.image
  };

  // Validate image file type
  const contentType = options.contentType || detectContentType(filename);
  if (contentType && !isImageFile(contentType)) {
    throw new Error('Invalid image file type');
  }

  return uploadFile(imageFile, filename, imageOptions);
}

/**
 * Upload a document file
 */
export async function uploadDocumentFile(
  documentFile: File | Buffer,
  filename: string,
  options: Omit<UploadOptions, 'folder' | 'maxSizeBytes'> = {}
): Promise<UploadResult> {
  const documentOptions: UploadOptions = {
    ...options,
    folder: 'document-submissions',
    maxSizeBytes: FILE_SIZE_LIMITS.document
  };

  // Validate document file type
  const contentType = options.contentType || detectContentType(filename);
  if (contentType && !isDocumentFile(contentType)) {
    throw new Error('Invalid document file type');
  }

  return uploadFile(documentFile, filename, documentOptions);
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob storage not configured');
    }

    await del(url, { token: BLOB_READ_WRITE_TOKEN });
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(url: string): Promise<FileMetadata | null> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob storage not configured');
    }

    const response = await head(url, { token: BLOB_READ_WRITE_TOKEN });

    return {
      url: url,
      pathname: response.pathname,
      size: response.contentLength || 0,
      contentType: response.contentType || 'application/octet-stream',
      uploadedAt: response.uploadedAt,
      lastModified: new Date(response.lastModified || response.uploadedAt)
    };
  } catch (error) {
    console.error('File metadata error:', error);
    return null;
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  folder: string = 'uploads',
  limit: number = 50
): Promise<FileMetadata[]> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob storage not configured');
    }

    const response = await list({
      prefix: `${folder}/`,
      limit,
      token: BLOB_READ_WRITE_TOKEN
    });

    return response.blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      contentType: blob.contentType || 'application/octet-stream',
      uploadedAt: blob.uploadedAt,
      lastModified: new Date(blob.lastModified || blob.uploadedAt)
    }));
  } catch (error) {
    console.error('File listing error:', error);
    return [];
  }
}

/**
 * Clean up old files (for maintenance)
 */
export async function cleanupOldFiles(
  folder: string,
  daysOld: number = 30
): Promise<{ deleted: number; errors: number }> {
  try {
    const files = await listFiles(folder, 1000); // Get up to 1000 files
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deleted = 0;
    let errors = 0;

    for (const file of files) {
      if (file.uploadedAt < cutoffDate) {
        const success = await deleteFile(file.url);
        if (success) {
          deleted++;
        } else {
          errors++;
        }
      }
    }

    console.log(`Cleanup complete: deleted ${deleted} files, ${errors} errors`);
    return { deleted, errors };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { deleted: 0, errors: 1 };
  }
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  const contentType = detectContentType(filename);

  if (!contentType) {
    return { valid: false, error: 'Unable to determine file type' };
  }

  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: `File type ${contentType} not allowed` };
  }

  return { valid: true };
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex);
}

/**
 * Detect content type from filename
 */
export function detectContentType(filename: string): string | null {
  const extension = getFileExtension(filename).toLowerCase();

  for (const category of Object.values(SUPPORTED_FILE_TYPES)) {
    for (const [mimeType, extensions] of Object.entries(category)) {
      if (extensions.includes(extension)) {
        return mimeType;
      }
    }
  }

  return null;
}

/**
 * Check if file is an audio file
 */
export function isAudioFile(contentType: string): boolean {
  return contentType.startsWith('audio/') &&
         Object.keys(SUPPORTED_FILE_TYPES.audio).includes(contentType);
}

/**
 * Check if file is an image file
 */
export function isImageFile(contentType: string): boolean {
  return contentType.startsWith('image/') &&
         Object.keys(SUPPORTED_FILE_TYPES.image).includes(contentType);
}

/**
 * Check if file is a document file
 */
export function isDocumentFile(contentType: string): boolean {
  return Object.keys(SUPPORTED_FILE_TYPES.document).includes(contentType);
}

/**
 * Check if file is a video file
 */
export function isVideoFile(contentType: string): boolean {
  return contentType.startsWith('video/') &&
         Object.keys(SUPPORTED_FILE_TYPES.video).includes(contentType);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate secure filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const baseName = originalFilename.replace(extension, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);

  return `${baseName}_${timestamp}_${randomId}${extension}`;
}

/**
 * Create presigned upload URL (for client-side uploads)
 */
export async function createPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  finalUrl: string;
}> {
  try {
    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob storage not configured');
    }

    const secureFilename = generateSecureFilename(filename);
    const pathname = `${folder}/${secureFilename}`;

    // For Vercel Blob, we return the direct upload endpoint
    // Note: This is simplified - in production you might want to use signed URLs
    const uploadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/upload`;
    const finalUrl = `https://blob.vercel-storage.com/${pathname}`;

    return {
      uploadUrl,
      fields: {
        filename: secureFilename,
        contentType,
        pathname
      },
      finalUrl
    };
  } catch (error) {
    console.error('Presigned URL creation error:', error);
    throw new Error('Failed to create upload URL');
  }
}

/**
 * Batch upload multiple files
 */
export async function batchUpload(
  files: Array<{ file: File | Buffer; filename: string; options?: UploadOptions }>,
  concurrency: number = 3
): Promise<Array<{ success: boolean; result?: UploadResult; error?: string; filename: string }>> {
  const results: Array<{ success: boolean; result?: UploadResult; error?: string; filename: string }> = [];

  // Process uploads in batches
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchPromises = batch.map(async ({ file, filename, options }) => {
      try {
        const result = await uploadFile(file, filename, options);
        return { success: true, result, filename };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          filename
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  filesByType: Record<string, number>;
}> {
  try {
    const folders = ['uploads', 'audio-submissions', 'image-submissions', 'document-submissions'];
    let totalFiles = 0;
    let totalSize = 0;
    const filesByType: Record<string, number> = {};

    for (const folder of folders) {
      const files = await listFiles(folder, 1000);
      totalFiles += files.length;

      for (const file of files) {
        totalSize += file.size;
        const type = file.contentType.split('/')[0];
        filesByType[type] = (filesByType[type] || 0) + 1;
      }
    }

    return {
      totalFiles,
      totalSize,
      averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
      filesByType
    };
  } catch (error) {
    console.error('Storage stats error:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      averageFileSize: 0,
      filesByType: {}
    };
  }
}

/**
 * Check browser support for audio features
 */
export function checkAudioSupport() {
  const support = {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
  };

  return support;
}

/**
 * Get audio duration from file
 */
export function getAudioDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = objectUrl;
  });
}

/**
 * Analyze audio quality
 */
export interface AudioQualityMetrics {
  score: number; // 1-5 rating
  issues: string[];
  recommendations: string[];
  backgroundNoiseLevel: 'low' | 'medium' | 'high';
  bitrate?: number;
  sampleRate?: number;
}

export async function analyzeAudioQuality(
  file: File | Blob,
  stream?: MediaStream
): Promise<AudioQualityMetrics> {
  const duration = await getAudioDuration(file);
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Basic quality checks
  let score = 5;

  // Check duration
  if (duration < 10) {
    score -= 1;
    issues.push('Recording is very short');
    recommendations.push('Record for at least 10 seconds for better quality analysis');
  }

  // Check file size (approximates bitrate)
  const bitrate = (file.size * 8) / duration / 1000; // kbps

  if (bitrate < 64) {
    score -= 1;
    issues.push('Low bitrate detected');
    recommendations.push('Use higher quality recording settings');
  }

  // Analyze background noise if stream is available
  let backgroundNoiseLevel: 'low' | 'medium' | 'high' = 'low';

  if (stream) {
    // This would require more sophisticated audio analysis
    // For now, we'll use a simplified approach
    backgroundNoiseLevel = 'medium'; // Placeholder
  }

  if (backgroundNoiseLevel === 'high') {
    score -= 1;
    issues.push('High background noise detected');
    recommendations.push('Record in a quieter environment');
  }

  // Check format
  if (!file.type.includes('wav') && !file.type.includes('webm')) {
    score -= 0.5;
    issues.push('Compressed audio format detected');
    recommendations.push('Use uncompressed formats like WAV for best quality');
  }

  return {
    score: Math.max(1, Math.min(5, score)),
    issues,
    recommendations,
    backgroundNoiseLevel,
    bitrate,
  };
}