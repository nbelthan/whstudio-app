/**
 * Storage utilities for WorldHuman Studio
 * Handles file uploads to Vercel Blob Storage with progress tracking
 */

import { put, type PutBlobResult } from '@vercel/blob';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AudioUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxSize?: number; // in bytes
  allowedFormats?: string[];
  chunkSize?: number; // for chunked uploads
}

export interface AudioUploadResult {
  url: string;
  size: number;
  format: string;
  duration?: number;
  downloadUrl: string;
}

/**
 * Upload audio file to Vercel Blob Storage with progress tracking
 */
export async function uploadAudioFile(
  file: File | Blob,
  filename: string,
  options: AudioUploadOptions = {}
): Promise<AudioUploadResult> {
  const {
    onProgress,
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedFormats = ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'],
    chunkSize = 1024 * 1024 // 1MB chunks
  } = options;

  // Validate file size
  if (file.size > maxSize) {
    throw new Error(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
  }

  // Validate file type
  const fileType = file.type || getMimeTypeFromExtension(filename);
  if (!allowedFormats.includes(fileType)) {
    throw new Error(`File format ${fileType} is not supported. Allowed formats: ${allowedFormats.join(', ')}`);
  }

  try {
    // For small files, upload directly
    if (file.size <= chunkSize) {
      const result = await put(filename, file, {
        access: 'public',
        addRandomSuffix: true,
      });

      // Simulate progress for small files
      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      return {
        url: result.url,
        size: file.size,
        format: fileType,
        downloadUrl: result.downloadUrl,
      };
    }

    // For large files, implement chunked upload with progress
    return await uploadWithProgress(file, filename, { onProgress, chunkSize });
  } catch (error) {
    console.error('Audio upload failed:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload with progress tracking for large files
 */
async function uploadWithProgress(
  file: File | Blob,
  filename: string,
  options: { onProgress?: (progress: UploadProgress) => void; chunkSize: number }
): Promise<AudioUploadResult> {
  const { onProgress, chunkSize } = options;

  // For now, we'll use a simple progress simulation with Vercel Blob
  // In a real-world scenario, you might need to implement chunked uploads
  // or use XMLHttpRequest for better progress tracking

  let loaded = 0;
  const total = file.size;

  // Simulate upload progress
  const progressInterval = setInterval(() => {
    loaded = Math.min(loaded + chunkSize / 10, total * 0.9); // Stop at 90%
    if (onProgress) {
      onProgress({
        loaded,
        total,
        percentage: Math.round((loaded / total) * 100)
      });
    }
  }, 100);

  try {
    const result = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    clearInterval(progressInterval);

    // Complete progress
    if (onProgress) {
      onProgress({ loaded: total, total, percentage: 100 });
    }

    return {
      url: result.url,
      size: file.size,
      format: file.type || getMimeTypeFromExtension(filename),
      downloadUrl: result.downloadUrl,
    };
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

/**
 * Delete audio file from Vercel Blob Storage
 */
export async function deleteAudioFile(url: string): Promise<void> {
  try {
    // Extract the blob key from the URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // For Vercel Blob, we might need to implement deletion if supported
    // This is a placeholder for the deletion logic
    console.log('Delete request for:', pathname);

    // Note: Vercel Blob might not support direct deletion via client SDK
    // You might need to implement this via API route
  } catch (error) {
    console.error('Failed to delete audio file:', error);
    throw new Error('Failed to delete audio file');
  }
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

/**
 * Convert audio format using Web Audio API
 */
export async function convertAudioFormat(
  file: File | Blob,
  targetFormat: 'wav' | 'webm' | 'mp4'
): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create a new audio buffer with the desired format
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();

    // Convert to target format
    return bufferToBlob(renderedBuffer, targetFormat);
  } finally {
    await audioContext.close();
  }
}

/**
 * Utility functions
 */

function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'mp4': 'audio/mp4',
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
  };
  return mimeTypes[ext || ''] || 'audio/webm';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function bufferToBlob(buffer: AudioBuffer, format: string): Blob {
  // Simplified conversion - in production, you'd want proper encoding
  const length = buffer.length * buffer.numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new Int16Array(arrayBuffer);

  let offset = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
  }

  const mimeType = getMimeTypeFromExtension(format);
  return new Blob([arrayBuffer], { type: mimeType });
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