/**
 * Payment Button Component
 * Integrates with MiniKit payment system for World App
 */

'use client';

import React, { useState, useCallback } from 'react';
import { MiniKit, PaymentPayload } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { DollarSign, CreditCard, Wallet, CheckCircle, AlertCircle, Clock } from 'lucide-react';

import { Button, Card, Badge, LoadingSpinner, Modal } from '@/components/ui';
import { usePayments, useUI, useAuth } from '@/stores';
import { Payment, PaymentStatus, RewardCurrency } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface PaymentButtonProps {
  amount: number;
  currency?: RewardCurrency;
  description?: string;
  recipient?: string;
  onSuccess?: (payment: Payment) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  currency = 'WLD',
  description = 'Payment',
  recipient,
  onSuccess,
  onError,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className,
}) => {
  const { isInstalled } = useMiniKit();
  const { user } = useAuth();
  const { addPayment, setPaymentLoading } = usePayments();
  const { addNotification } = useUI();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handlePayment = useCallback(async () => {
    if (!isInstalled || !user) {
      const errorMsg = 'World App is required to process payments';
      onError?.(errorMsg);
      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: errorMsg,
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setPaymentLoading('initiate', true);

    try {
      // First, initiate payment on our backend
      const initiateResponse = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          recipient,
        }),
      });

      if (!initiateResponse.ok) {
        throw new Error('Failed to initiate payment');
      }

      const { payment_id, reference } = await initiateResponse.json();

      // Prepare payment payload for MiniKit
      const paymentPayload: PaymentPayload = {
        reference,
        to: recipient || user.wallet_address || '',
        tokens: [
          {
            symbol: currency,
            token_amount: amount.toString(),
          },
        ],
        description,
      };

      // Request payment via MiniKit
      const result = await MiniKit.commandsAsync.pay(paymentPayload);

      if (result.status === 'success') {
        // Confirm payment on backend
        const confirmResponse = await fetch(`/api/payments/${payment_id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction_hash: result.finalPayload?.transaction_hash,
            status: 'completed',
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm payment');
        }

        const confirmedPayment = await confirmResponse.json();

        // Update local state
        addPayment(confirmedPayment.payment);
        setPaymentStatus('completed');

        addNotification({
          type: 'success',
          title: 'Payment Successful',
          message: `Payment of ${formatCurrency(amount, currency)} completed successfully`,
        });

        onSuccess?.(confirmedPayment.payment);

      } else {
        throw new Error(result.errorMessage || 'Payment was cancelled or failed');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';

      setPaymentStatus('failed');
      onError?.(errorMsg);

      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: errorMsg,
      });

    } finally {
      setIsProcessing(false);
      setPaymentLoading('initiate', false);

      // Reset status after 3 seconds
      setTimeout(() => setPaymentStatus(null), 3000);
    }
  }, [
    isInstalled,
    user,
    amount,
    currency,
    description,
    recipient,
    onSuccess,
    onError,
    addPayment,
    setPaymentLoading,
    addNotification,
  ]);

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <>
          <LoadingSpinner size="sm" color="white" />
          <span>Processing...</span>
        </>
      );
    }

    if (paymentStatus === 'completed') {
      return (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>Payment Sent</span>
        </>
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Payment Failed</span>
        </>
      );
    }

    return (
      <>
        <Wallet className="w-4 h-4" />
        <span>Pay {formatCurrency(amount, currency)}</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (paymentStatus === 'completed') return 'success';
    if (paymentStatus === 'failed') return 'destructive';
    return variant;
  };

  const isButtonDisabled = disabled || isProcessing || !isInstalled || !user;

  return (
    <>
      <Button
        size={size}
        variant={getButtonVariant()}
        disabled={isButtonDisabled}
        onClick={paymentStatus === null ? handlePayment : () => setShowDetails(true)}
        className={className}
      >
        {getButtonContent()}
      </Button>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Payment Details"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <span className="text-white/80">Amount</span>
            <span className="text-white font-semibold">
              {formatCurrency(amount, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <span className="text-white/80">Description</span>
            <span className="text-white">{description}</span>
          </div>

          {recipient && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <span className="text-white/80">Recipient</span>
              <span className="text-white font-mono text-sm">
                {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <span className="text-white/80">Status</span>
            <Badge
              variant={
                paymentStatus === 'completed' ? 'success' :
                paymentStatus === 'processing' ? 'info' :
                paymentStatus === 'failed' ? 'error' : 'default'
              }
            >
              {paymentStatus || 'ready'}
            </Badge>
          </div>

          {!isInstalled && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">World App Required</p>
                  <p className="text-white/70 text-sm mt-1">
                    Please open this in World App to process payments.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {paymentStatus === null && (
            <Button onClick={handlePayment} disabled={isButtonDisabled}>
              Proceed to Pay
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PaymentButton;