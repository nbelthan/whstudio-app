/**
 * PaymentButton Component
 * Reusable button component for triggering MiniKit payments
 */

'use client';

import React, { useState } from 'react';
import {
  Button,
  Typography,
  Chip
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentType, RewardCurrency } from '@/types';
import PaymentProcessor from './PaymentProcessor';

interface PaymentButtonProps {
  // Payment details
  paymentType: PaymentType;
  amount: number;
  currency?: RewardCurrency;
  description?: string;

  // Task/submission context
  taskId?: string;
  submissionId?: string;
  recipientId?: string;
  recipientAddress?: string;

  // Button customization
  label?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;

  // Event handlers
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;

  // UI options
  showAmount?: boolean;
  showIcon?: boolean;
  compact?: boolean;
}

export default function PaymentButton({
  paymentType,
  amount,
  currency = 'WLD',
  description,
  taskId,
  submissionId,
  recipientId,
  recipientAddress,
  label,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className,
  onSuccess,
  onError,
  onCancel,
  showAmount = true,
  showIcon = true,
  compact = false
}: PaymentButtonProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | null>(null);

  // Generate button label based on payment type
  const getButtonLabel = () => {
    if (label) return label;

    const amountStr = showAmount ? ` ${formatCurrency(amount, currency)}` : '';

    switch (paymentType) {
      case 'task_reward':
        return `Pay Reward${amountStr}`;
      case 'escrow_deposit':
        return `Deposit Escrow${amountStr}`;
      case 'escrow_release':
        return `Release Payment${amountStr}`;
      case 'refund':
        return `Process Refund${amountStr}`;
      default:
        return `Pay${amountStr}`;
    }
  };

  // Get button icon based on payment type and status
  const getButtonIcon = () => {
    if (!showIcon) return null;

    if (isProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }

    if (paymentStatus === 'success') {
      return <CheckCircle className="w-4 h-4" />;
    }

    if (paymentStatus === 'error') {
      return <XCircle className="w-4 h-4" />;
    }

    switch (paymentType) {
      case 'task_reward':
        return <DollarSign className="w-4 h-4" />;
      case 'escrow_deposit':
        return <Clock className="w-4 h-4" />;
      case 'escrow_release':
        return <CheckCircle className="w-4 h-4" />;
      case 'refund':
        return <XCircle className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  // Get button variant based on status
  const getButtonVariant = () => {
    if (paymentStatus === 'success') return 'success';
    if (paymentStatus === 'error') return 'error';
    return variant;
  };

  const handleClick = () => {
    if (disabled || isProcessing) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentStatus('success');
    setIsProcessing(false);
    setShowPaymentModal(false);
    onSuccess?.(paymentId);

    // Reset status after 3 seconds
    setTimeout(() => {
      setPaymentStatus(null);
    }, 3000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setIsProcessing(false);
    setShowPaymentModal(false);
    onError?.(error);

    // Reset status after 5 seconds
    setTimeout(() => {
      setPaymentStatus(null);
    }, 5000);
  };

  const handleCancel = () => {
    setShowPaymentModal(false);
    setIsProcessing(false);
    onCancel?.();
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <Button
            variant={getButtonVariant() as any}
            size="small"
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={className}
          >
            {getButtonIcon()}
          </Button>

          {showAmount && (
            <Typography variant="caption" className="text-white/60">
              {formatCurrency(amount, currency)}
            </Typography>
          )}

          {paymentStatus && (
            <Chip
              variant={paymentStatus === 'success' ? 'success' : 'error'}
              size="small"
            >
              {paymentStatus === 'success' ? 'Paid' : 'Failed'}
            </Chip>
          )}
        </div>

        <PaymentProcessor
          isOpen={showPaymentModal}
          onClose={handleCancel}
          paymentType={paymentType}
          amount={amount}
          currency={currency}
          taskId={taskId}
          submissionId={submissionId}
          recipientId={recipientId}
          recipientAddress={recipientAddress}
          description={description}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={getButtonVariant() as any}
        size={size}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={className}
      >
        <div className="flex items-center space-x-2">
          {getButtonIcon()}
          <span>{getButtonLabel()}</span>
        </div>
      </Button>

      {/* Payment Status Display */}
      {paymentStatus && (
        <div className="mt-2">
          <Chip
            variant={paymentStatus === 'success' ? 'success' : 'error'}
            size="small"
          >
            {paymentStatus === 'success' ? 'Payment Successful' : 'Payment Failed'}
          </Chip>
        </div>
      )}

      {/* Payment Details */}
      {!compact && (
        <div className="mt-2 space-y-1">
          <Typography variant="caption" className="text-white/60 block">
            Payment Type: {paymentType.replace('_', ' ')}
          </Typography>
          {description && (
            <Typography variant="caption" className="text-white/60 block">
              {description}
            </Typography>
          )}
        </div>
      )}

      <PaymentProcessor
        isOpen={showPaymentModal}
        onClose={handleCancel}
        paymentType={paymentType}
        amount={amount}
        currency={currency}
        taskId={taskId}
        submissionId={submissionId}
        recipientId={recipientId}
        recipientAddress={recipientAddress}
        description={description}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  );
}

export default PaymentButton;