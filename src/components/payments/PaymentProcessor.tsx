/**
 * PaymentProcessor Component
 * Modal interface for processing payments through MiniKit with comprehensive status tracking
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  ProgressBar,
  Chip,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import { Modal } from '@/components/ui';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';
import { formatCurrency } from '@/lib/utils';
import { PaymentType, RewardCurrency } from '@/types';

interface PaymentProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  paymentType: PaymentType;
  amount: number;
  currency?: RewardCurrency;
  taskId?: string;
  submissionId?: string;
  recipientId?: string;
  recipientAddress?: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export default function PaymentProcessor({
  isOpen,
  onClose,
  paymentType,
  amount,
  currency = 'WLD',
  taskId,
  submissionId,
  recipientId,
  recipientAddress,
  description,
  onSuccess,
  onError
}: PaymentProcessorProps) {
  const insets = useSafeAreaInsets();
  const {
    isProcessing,
    currentPayment,
    paymentStatus,
    transactionHash,
    error,
    processPayment,
    getEstimatedFees,
    getStatusDisplay,
    retryPayment,
    reset
  } = usePaymentProcessor();

  const [fees, setFees] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load fee estimates when modal opens
  useEffect(() => {
    if (isOpen && amount > 0) {
      getEstimatedFees(amount, currency).then(setFees);
    }
  }, [isOpen, amount, currency, getEstimatedFees]);

  // Handle payment completion
  useEffect(() => {
    if (paymentStatus === 'completed' && currentPayment) {
      onSuccess?.(currentPayment.id);
    } else if (paymentStatus === 'failed' && error) {
      onError?.(error);
    }
  }, [paymentStatus, currentPayment, error, onSuccess, onError]);

  const handleClose = () => {
    reset();
    setShowConfirmation(false);
    onClose();
  };

  const handleConfirmPayment = async () => {
    setShowConfirmation(true);

    try {
      await processPayment({
        paymentType,
        amount,
        currency,
        taskId,
        submissionId,
        recipientId,
        recipientAddress,
        description
      });
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleRetry = async () => {
    try {
      await retryPayment();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const statusDisplay = getStatusDisplay();
  const progress = paymentStatus === 'pending' ? 25 : paymentStatus === 'processing' ? 75 : 100;

  const renderContent = () => {
    // Initial confirmation screen
    if (!showConfirmation && !isProcessing && !paymentStatus) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <DollarSign className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <Typography variant="h3" className="text-white mb-2">
              Confirm Payment
            </Typography>
            <Typography variant="body2" className="text-white/60">
              Review the payment details before proceeding
            </Typography>
          </div>

          {/* Payment Details */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Typography variant="body2" className="text-white/60">
                Amount
              </Typography>
              <Typography variant="h4" className="text-white">
                {formatCurrency(amount, currency)}
              </Typography>
            </div>

            <div className="flex justify-between items-center">
              <Typography variant="body2" className="text-white/60">
                Payment Type
              </Typography>
              <Chip variant="secondary" size="small">
                {paymentType.replace('_', ' ')}
              </Chip>
            </div>

            {fees && (
              <>
                <div className="flex justify-between items-center">
                  <Typography variant="body2" className="text-white/60">
                    Gas Fee
                  </Typography>
                  <Typography variant="body2" className="text-green-400">
                    {fees.isSponsored ? 'Sponsored' : formatCurrency(fees.gasFee, currency)}
                  </Typography>
                </div>

                {fees.platformFee > 0 && (
                  <div className="flex justify-between items-center">
                    <Typography variant="body2" className="text-white/60">
                      Platform Fee
                    </Typography>
                    <Typography variant="body2" className="text-white">
                      {formatCurrency(fees.platformFee, currency)}
                    </Typography>
                  </div>
                )}

                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between items-center">
                    <Typography variant="body1" className="text-white font-medium">
                      Total
                    </Typography>
                    <Typography variant="h4" className="text-white">
                      {formatCurrency(fees.netAmount, currency)}
                    </Typography>
                  </div>
                </div>
              </>
            )}

            {description && (
              <div className="border-t border-white/10 pt-3">
                <Typography variant="caption" className="text-white/60 block mb-1">
                  Description
                </Typography>
                <Typography variant="body2" className="text-white">
                  {description}
                </Typography>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPayment}
              className="flex-1"
              disabled={!fees}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </div>
        </div>
      );
    }

    // Processing/Status screen
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">{statusDisplay.icon}</div>
          <Typography variant="h3" className={`${statusDisplay.color} mb-2`}>
            {statusDisplay.title}
          </Typography>
          <Typography variant="body2" className="text-white/60">
            {statusDisplay.description}
          </Typography>
        </div>

        {/* Progress Bar */}
        {statusDisplay.showProgress && (
          <div className="space-y-2">
            <ProgressBar value={progress} className="w-full" />
            <Typography variant="caption" className="text-white/60 text-center block">
              {progress}% Complete
            </Typography>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <Typography variant="body2" className="text-white/60">
              Payment Amount
            </Typography>
            <Typography variant="h4" className="text-white">
              {formatCurrency(amount, currency)}
            </Typography>
          </div>

          {transactionHash && (
            <div className="flex justify-between items-center">
              <Typography variant="body2" className="text-white/60">
                Transaction
              </Typography>
              <Typography variant="caption" className="text-blue-400">
                #{transactionHash.slice(0, 8)}...
              </Typography>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {paymentStatus === 'failed' && (
            <Button
              variant="primary"
              onClick={handleRetry}
              disabled={isProcessing}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Payment
            </Button>
          )}

          {(paymentStatus === 'completed' || paymentStatus === 'failed' || paymentStatus === 'cancelled') && (
            <Button
              variant="secondary"
              onClick={handleClose}
              className="w-full"
            >
              {paymentStatus === 'completed' ? 'Done' : 'Close'}
            </Button>
          )}
        </div>

        {/* Error Details */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <Typography variant="body2" className="text-red-400 font-medium mb-1">
                  Payment Error
                </Typography>
                <Typography variant="caption" className="text-red-300">
                  {error}
                </Typography>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        {renderContent()}
      </div>
    </Modal>
  );
}

export default PaymentProcessor;