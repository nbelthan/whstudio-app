/**
 * Utility functions for WorldHuman Studio App
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TaskType, TaskDifficulty, RewardCurrency } from '@/types';

export const BUTTON_INTENTS = {
  primary:
    '!bg-[var(--color-accent-blue)] !text-black !font-semibold !shadow-[0_12px_30px_rgba(75,122,242,0.35)] !hover:bg-[color-mix(in srgb,var(--color-accent-blue) 94%,white 6%)] !hover:shadow-[0_18px_40px_rgba(75,122,242,0.45)] !active:bg-[color-mix(in srgb,var(--color-accent-blue) 82%,black 18%)] !active:shadow-[0_8px_20px_rgba(75,122,242,0.25)] !transition-all !duration-200 disabled:!bg-[color-mix(in srgb,var(--color-accent-blue) 30%,var(--color-bg-surface) 70%)] disabled:!text-[color-mix(in srgb,black 35%,var(--color-text-secondary) 65%)] disabled:!shadow-none disabled:!opacity-90',
  secondary:
    '!border !border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] !bg-[color-mix(in srgb,var(--color-bg-surface) 92%,transparent)] !text-[var(--color-text-primary)] !font-semibold !transition-all !duration-200 !hover:border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] !hover:bg-[color-mix(in srgb,var(--color-bg-surface) 82%,var(--color-accent-blue) 12%)] !hover:text-[var(--color-text-primary)] !shadow-none disabled:!border-[color-mix(in srgb,var(--color-divider-low) 50%,transparent)] disabled:!bg-[color-mix(in srgb,var(--color-bg-surface) 94%,transparent)] disabled:!text-[color-mix(in srgb,var(--color-text-secondary) 75%,transparent)] disabled:!opacity-90',
  ghost:
    '!text-[var(--color-text-secondary)] !hover:text-[var(--color-text-primary)] !bg-transparent !hover:bg-[color-mix(in srgb,var(--color-bg-surface) 78%,transparent)] !transition-colors !duration-150',
} as const;

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amounts
 */
export function formatCurrency(amount: number, currency: RewardCurrency = 'WLD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'WLD' ? 2 : 4,
    maximumFractionDigits: currency === 'WLD' ? 2 : 8,
  }).format(amount);

  return `${formatted} ${currency}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get task type display name
 */
export function getTaskTypeDisplayName(taskType: TaskType): string {
  const taskTypeNames: Record<TaskType, string> = {
    data_entry: 'Data Entry',
    content_review: 'Content Review',
    transcription: 'Transcription',
    translation: 'Translation',
    image_tagging: 'Image Tagging',
    quality_assurance: 'Quality Assurance',
    research: 'Research',
    creative_tasks: 'Creative Tasks',
    rlhf_rating: 'RLHF Rating',
    voice_recording: 'Voice Recording',
    data_annotation: 'Data Annotation',
  };

  return taskTypeNames[taskType] || taskType;
}

/**
 * Get task difficulty display properties
 */
export function getTaskDifficultyProps(level: TaskDifficulty): {
  label: string;
  color: string;
  bgColor: string;
} {
  const difficultyProps: Record<TaskDifficulty, { label: string; color: string; bgColor: string }> = {
    1: {
      label: 'Beginner',
      color: 'text-[var(--color-success)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-success) 18%,transparent)]',
    },
    2: {
      label: 'Easy',
      color: 'text-[var(--color-accent-blue)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)]',
    },
    3: {
      label: 'Medium',
      color: 'text-[var(--color-warning)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-warning) 18%,transparent)]',
    },
    4: {
      label: 'Hard',
      color: 'text-[var(--color-error)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-error) 18%,transparent)]',
    },
    5: {
      label: 'Expert',
      color: 'text-[var(--color-error)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-error) 26%,transparent)]',
    },
  };

  return difficultyProps[level];
}

/**
 * Get status display properties
 */
export function getStatusProps(status: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statusProps: Record<string, { label: string; color: string; bgColor: string }> = {
    // Task statuses
    draft: {
      label: 'Draft',
      color: 'text-[var(--color-text-secondary)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-divider-low) 25%,transparent)]',
    },
    active: {
      label: 'Active',
      color: 'text-[var(--color-success)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-success) 18%,transparent)]',
    },
    paused: {
      label: 'Paused',
      color: 'text-[var(--color-warning)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-warning) 18%,transparent)]',
    },
    completed: {
      label: 'Completed',
      color: 'text-[var(--color-accent-blue)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)]',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'text-[var(--color-error)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-error) 18%,transparent)]',
    },

    // Submission statuses
    pending: {
      label: 'Pending',
      color: 'text-[var(--color-warning)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-warning) 18%,transparent)]',
    },
    approved: {
      label: 'Approved',
      color: 'text-[var(--color-success)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-success) 18%,transparent)]',
    },
    rejected: {
      label: 'Rejected',
      color: 'text-[var(--color-error)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-error) 18%,transparent)]',
    },
    under_review: {
      label: 'Under Review',
      color: 'text-[var(--color-accent-teal)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-accent-teal) 18%,transparent)]',
    },

    // Payment statuses
    processing: {
      label: 'Processing',
      color: 'text-[var(--color-accent-blue)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)]',
    },
    failed: {
      label: 'Failed',
      color: 'text-[var(--color-error)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-error) 18%,transparent)]',
    },
  };

  return (
    statusProps[status] || {
      label: status,
      color: 'text-[var(--color-text-secondary)]',
      bgColor: 'bg-[color-mix(in srgb,var(--color-divider-low) 25%,transparent)]',
    }
  );
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get task type icon emoji
 */
export function getTaskTypeIcon(taskType: TaskType): string {
  const taskTypeIcons: Record<TaskType, string> = {
    data_entry: '📝',
    content_review: '👀',
    transcription: '🎤',
    translation: '🌐',
    image_tagging: '🏷️',
    quality_assurance: '✅',
    research: '🔍',
    creative_tasks: '🎨',
    rlhf_rating: '🎯',
    voice_recording: '🎙️',
    data_annotation: '📊',
  };

  return taskTypeIcons[taskType] || '📋';
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/**
 * Parse error message from API response
 */
export function parseErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
}

/**
 * Format date to human readable format
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format relative time (alias for formatTimeAgo for consistency)
 */
export function formatRelativeTime(date: string | Date): string {
  return formatTimeAgo(date);
}
