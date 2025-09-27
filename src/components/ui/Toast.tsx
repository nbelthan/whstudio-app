/**
 * Toast Notification Component
 * Shows temporary success/error messages
 */

'use client';

import React, { useEffect } from 'react';
import { Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'reward';
  title: string;
  message?: string;
  show: boolean;
  onClose?: () => void;
  duration?: number;
}

export default function Toast({
  type,
  title,
  message,
  show,
  onClose,
  duration = 3000
}: ToastProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-400" />;
      case 'reward':
        return <DollarSign className="w-6 h-6 text-green-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
      case 'reward':
        return 'bg-green-500/20 border-green-500/40';
      case 'error':
        return 'bg-red-500/20 border-red-500/40';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/40';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
      case 'reward':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
    }
  };

  const getMessageColor = () => {
    switch (type) {
      case 'success':
      case 'reward':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      case 'warning':
        return 'text-yellow-300';
    }
  };

  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md ${show ? 'animate-slide-down' : 'animate-slide-up'}`}>
      <div className={`${getStyles()} border rounded-2xl p-4 shadow-2xl backdrop-blur-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <Typography variant="h4" className={`${getTitleColor()} mb-1`}>
              {title}
            </Typography>
            {message && (
              <Typography variant="body2" className={getMessageColor()}>
                {message}
              </Typography>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add CSS animations to globals.css
export const toastAnimations = `
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translate(-50%, -100%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes slide-up {
  from {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -100%);
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out forwards;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}`;