/**
 * UI Components Index
 * Centralized exports for all reusable UI components
 */

export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Modal, ConfirmModal } from './Modal';
export { default as Badge } from './Badge';
export {
  default as Loading,
  LoadingSpinner,
  LoadingDots,
  LoadingSkeleton,
  LoadingCard,
  LoadingOverlay,
  LoadingPage,
  LoadingButton,
} from './Loading';

// Re-export types for convenience
export type { BaseComponentProps } from '@/types';