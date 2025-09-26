/**
 * Modal component with overlay and various sizes
 * Provides accessible modal dialogs with proper focus management
 */

import React, { forwardRef, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { BaseComponentProps } from '@/types';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  showCloseButton?: boolean;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(({
  className,
  children,
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventClose = false,
  showCloseButton = true,
  ...props
}, ref) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !preventClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, preventClose, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && closeOnBackdrop && !preventClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pb-3">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-black/90 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-md animate-slide-up focus:outline-none',
          sizeClasses[size],
          size === 'full' ? 'h-full' : 'max-h-[90vh] overflow-hidden',
          className
        )}
        tabIndex={-1}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {title && (
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            )}
            {!title && <div />}

            {showCloseButton && !preventClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white/60 hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'px-6 py-4',
            size === 'full' ? 'flex-1 overflow-auto' : 'max-h-[70vh] overflow-auto'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

// Modal subcomponents
interface ModalHeaderProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
}

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(({
  className,
  children,
  title,
  subtitle,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('mb-6', className)}
    {...props}
  >
    <h2 className="text-xl font-semibold text-white">{title}</h2>
    {subtitle && (
      <p className="text-white/60 mt-2">{subtitle}</p>
    )}
    {children}
  </div>
));

ModalHeader.displayName = 'ModalHeader';

interface ModalBodyProps extends BaseComponentProps {}

const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('text-white/80 space-y-4', className)}
    {...props}
  >
    {children}
  </div>
));

ModalBody.displayName = 'ModalBody';

interface ModalFooterProps extends BaseComponentProps {
  justify?: 'start' | 'center' | 'end' | 'between';
}

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(({
  className,
  children,
  justify = 'end',
  ...props
}, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 mt-6 pt-6 border-t border-white/10',
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ModalFooter.displayName = 'ModalFooter';

// Confirmation Modal Component
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" preventClose={loading}>
      <Modal.Header title={title} />
      <Modal.Body>
        <p className="text-white/80">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// Export compound component
export default Object.assign(Modal, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});