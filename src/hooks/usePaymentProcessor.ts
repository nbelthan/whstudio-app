/**
 * usePaymentProcessor Hook
 * MiniKit payment processing integration with comprehensive error handling and status tracking
 */

import { useState, useCallback, useRef } from 'react';
import { MiniKit, PaymentPayload, PaymentResponse } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useAuth, useUI } from '@/stores';
import { usePayments } from './usePayments';
import { Payment, PaymentStatus, RewardCurrency, PaymentType } from '@/types';

interface UsePaymentProcessorReturn {
  // State
  isProcessing: boolean;
  currentPayment: Payment | null;
  paymentStatus: PaymentStatus | null;
  transactionHash: string | null;
  error: string | null;

  // Processing functions
  processPayment: (params: ProcessPaymentParams) => Promise<Payment>;
  processTaskReward: (params: TaskRewardParams) => Promise<Payment>;
  processEscrowDeposit: (params: EscrowDepositParams) => Promise<Payment>;
  processEscrowRelease: (params: EscrowReleaseParams) => Promise<Payment>;
  processRefund: (params: RefundParams) => Promise<Payment>;

  // Utility functions
  validatePayment: (params: BasePaymentParams) => ValidationResult;
  checkDailyLimit: () => Promise<boolean>;
  getEstimatedFees: (amount: number, currency: RewardCurrency) => Promise<FeeEstimate>;
  retryPayment: () => Promise<void>;
  cancelPayment: () => Promise<void>;

  // Status functions
  reset: () => void;
  getStatusDisplay: () => StatusDisplay;
}

interface BasePaymentParams {
  amount: number;
  currency?: RewardCurrency;
  description?: string;
}

interface ProcessPaymentParams extends BasePaymentParams {
  paymentType: PaymentType;
  taskId?: string;
  submissionId?: string;
  recipientId?: string;
  recipientAddress?: string;
}

interface TaskRewardParams extends BasePaymentParams {
  taskId: string;
  submissionId: string;
}

interface EscrowDepositParams extends BasePaymentParams {
  taskId: string;
}

interface EscrowReleaseParams extends BasePaymentParams {
  taskId: string;
  submissionId: string;
}

interface RefundParams extends BasePaymentParams {
  originalPaymentId: string;
  reason?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FeeEstimate {
  gasFee: number;
  platformFee: number;
  totalFees: number;
  netAmount: number;
  isSponsored: boolean;
}

interface StatusDisplay {
  icon: string;
  title: string;
  description: string;
  color: string;
  showProgress: boolean;
}

export const usePaymentProcessor = (): UsePaymentProcessorReturn => {
  const { isInstalled } = useMiniKit();
  const { user } = useAuth();
  const { addNotification } = useUI();
  const { createPayment, confirmPayment, cancelPayment: cancelPaymentStore } = usePayments();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retryParamsRef = useRef<ProcessPaymentParams | null>(null);

  // Validate payment parameters
  const validatePayment = useCallback((params: BasePaymentParams): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isInstalled) {
      errors.push('World App is required to process payments');
    }

    if (!user) {
      errors.push('User authentication required');
    }

    if (!params.amount || params.amount <= 0) {
      errors.push('Invalid payment amount');
    }

    if (params.amount < 0.1) {
      errors.push('Minimum transfer amount is $0.1');
    }

    if (params.amount > 10000) {
      warnings.push('Large payment amount detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [isInstalled, user]);

  // Check daily transaction limit
  const checkDailyLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // This would typically check against the backend API
      // For now, we'll use a simple client-side check
      const today = new Date().toISOString().split('T')[0];
      const dailyCount = parseInt(localStorage.getItem(`daily_tx_${user.id}_${today}`) || '0');

      return dailyCount < 300;
    } catch (error) {
      console.error('Failed to check daily limit:', error);
      return true; // Assume limit not reached if check fails
    }
  }, [user]);

  // Get estimated fees
  const getEstimatedFees = useCallback(async (
    amount: number,
    currency: RewardCurrency
  ): Promise<FeeEstimate> => {
    // World Chain sponsors gas fees, so they should be minimal or zero
    const gasFee = 0; // Gas sponsored on World Chain
    const platformFee = amount * 0.01; // Example 1% platform fee
    const totalFees = gasFee + platformFee;
    const netAmount = amount - totalFees;

    return {
      gasFee,
      platformFee,
      totalFees,
      netAmount,
      isSponsored: true
    };
  }, []);

  // Get recipient wallet address
  const getRecipientAddress = useCallback(async (recipientId?: string): Promise<string> => {
    if (!recipientId) {
      return user?.wallet_address || '';
    }

    if (recipientId === user?.id) {
      return user.wallet_address || '';
    }

    try {
      const response = await fetch(`/api/users/${recipientId}`);
      if (response.ok) {
        const data = await response.json();
        return data.user?.wallet_address || '';
      }
    } catch (error) {
      console.error('Failed to get recipient address:', error);
    }

    return '';
  }, [user]);

  // Core payment processing function
  const processPayment = useCallback(async (params: ProcessPaymentParams): Promise<Payment> => {
    // Store params for retry functionality
    retryParamsRef.current = params;

    setIsProcessing(true);
    setPaymentStatus('pending');
    setError(null);
    setTransactionHash(null);

    try {
      // Validate payment
      const validation = validatePayment(params);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          addNotification({
            type: 'warning',
            title: 'Payment Warning',
            message: warning,
          });
        });
      }

      // Check daily limit
      const hasCapacity = await checkDailyLimit();
      if (!hasCapacity) {
        throw new Error('Daily transaction limit (300) exceeded');
      }

      // Step 1: Create payment record
      setPaymentStatus('processing');
      addNotification({
        type: 'info',
        title: 'Payment Initiated',
        message: 'Creating payment record...',
      });

      const payment = await createPayment({
        task_id: params.taskId,
        submission_id: params.submissionId,
        recipient_id: params.recipientId,
        amount: params.amount,
        currency: params.currency || 'WLD',
        payment_type: params.paymentType,
        description: params.description,
      });

      setCurrentPayment(payment);

      // Step 2: Get recipient address
      const recipientAddress = params.recipientAddress ||
        await getRecipientAddress(params.recipientId);

      if (!recipientAddress) {
        throw new Error('Recipient wallet address not found');
      }

      // Step 3: Prepare MiniKit payment payload
      const paymentPayload: PaymentPayload = {
        reference: payment.external_payment_id || payment.id,
        to: recipientAddress,
        tokens: [
          {
            symbol: params.currency || 'WLD',
            token_amount: params.amount.toString(),
          },
        ],
        description: params.description || `WorldHuman Studio - ${params.paymentType}`,
      };

      addNotification({
        type: 'info',
        title: 'Processing Payment',
        message: 'Opening World App for payment confirmation...',
      });

      // Step 4: Process through MiniKit
      const result = await MiniKit.commandsAsync.pay(paymentPayload);

      if (result.status !== 'success') {
        throw new Error(result.errorMessage || 'Payment was cancelled or failed');
      }

      const txHash = result.finalPayload?.transaction_hash;
      if (txHash) {
        setTransactionHash(txHash);
      }

      // Step 5: Confirm payment on backend
      const confirmedPayment = await confirmPayment(payment.id, {
        transaction_hash: txHash,
        status: 'completed',
        minikit_transaction_id: result.finalPayload?.transaction_id,
        gas_fee: 0, // Sponsored on World Chain
        platform_fee: 0, // Calculate if needed
      });

      setPaymentStatus('completed');
      setCurrentPayment(confirmedPayment);

      // Update daily transaction count
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const currentCount = parseInt(localStorage.getItem(`daily_tx_${user.id}_${today}`) || '0');
        localStorage.setItem(`daily_tx_${user.id}_${today}`, (currentCount + 1).toString());
      }

      addNotification({
        type: 'success',
        title: 'Payment Successful',
        message: `Payment of ${params.amount} ${params.currency || 'WLD'} completed successfully`,
      });

      return confirmedPayment;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';
      setError(errorMsg);
      setPaymentStatus('failed');

      // Try to update payment status if we have a payment record
      if (currentPayment) {
        try {
          await confirmPayment(currentPayment.id, {
            status: 'failed',
            failure_reason: errorMsg,
          });
        } catch (confirmError) {
          console.error('Failed to update payment status:', confirmError);
        }
      }

      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: errorMsg,
      });

      throw error;

    } finally {
      setIsProcessing(false);
    }
  }, [
    validatePayment,
    checkDailyLimit,
    createPayment,
    confirmPayment,
    getRecipientAddress,
    user,
    currentPayment,
    addNotification,
  ]);

  // Specialized payment processors
  const processTaskReward = useCallback(async (params: TaskRewardParams): Promise<Payment> => {
    return processPayment({
      ...params,
      paymentType: 'task_reward',
      description: params.description || `Task reward payment`,
    });
  }, [processPayment]);

  const processEscrowDeposit = useCallback(async (params: EscrowDepositParams): Promise<Payment> => {
    return processPayment({
      ...params,
      paymentType: 'escrow_deposit',
      description: params.description || `Escrow deposit for task`,
    });
  }, [processPayment]);

  const processEscrowRelease = useCallback(async (params: EscrowReleaseParams): Promise<Payment> => {
    return processPayment({
      ...params,
      paymentType: 'escrow_release',
      description: params.description || `Escrow release payment`,
    });
  }, [processPayment]);

  const processRefund = useCallback(async (params: RefundParams): Promise<Payment> => {
    return processPayment({
      ...params,
      paymentType: 'refund',
      description: params.description || `Refund: ${params.reason || 'Payment refund'}`,
    });
  }, [processPayment]);

  // Retry payment
  const retryPayment = useCallback(async (): Promise<void> => {
    if (!retryParamsRef.current) {
      throw new Error('No payment to retry');
    }

    setError(null);
    await processPayment(retryParamsRef.current);
  }, [processPayment]);

  // Cancel payment
  const cancelPayment = useCallback(async (): Promise<void> => {
    if (!currentPayment) {
      throw new Error('No payment to cancel');
    }

    await cancelPaymentStore(currentPayment.id);
    setPaymentStatus('cancelled');
    setIsProcessing(false);
  }, [currentPayment, cancelPaymentStore]);

  // Reset state
  const reset = useCallback(() => {
    setIsProcessing(false);
    setCurrentPayment(null);
    setPaymentStatus(null);
    setTransactionHash(null);
    setError(null);
    retryParamsRef.current = null;
  }, []);

  // Get status display
  const getStatusDisplay = useCallback((): StatusDisplay => {
    switch (paymentStatus) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Payment Pending',
          description: 'Preparing payment...',
          color: 'text-yellow-400',
          showProgress: true,
        };
      case 'processing':
        return {
          icon: '🔄',
          title: 'Processing Payment',
          description: 'Confirming transaction...',
          color: 'text-blue-400',
          showProgress: true,
        };
      case 'completed':
        return {
          icon: '✅',
          title: 'Payment Completed',
          description: 'Transaction confirmed on blockchain',
          color: 'text-green-400',
          showProgress: false,
        };
      case 'failed':
        return {
          icon: '❌',
          title: 'Payment Failed',
          description: error || 'Transaction failed',
          color: 'text-red-400',
          showProgress: false,
        };
      case 'cancelled':
        return {
          icon: '🚫',
          title: 'Payment Cancelled',
          description: 'Transaction was cancelled',
          color: 'text-gray-400',
          showProgress: false,
        };
      default:
        return {
          icon: '💳',
          title: 'Ready to Pay',
          description: 'Click to initiate payment',
          color: 'text-white',
          showProgress: false,
        };
    }
  }, [paymentStatus, error]);

  return {
    // State
    isProcessing,
    currentPayment,
    paymentStatus,
    transactionHash,
    error,

    // Processing functions
    processPayment,
    processTaskReward,
    processEscrowDeposit,
    processEscrowRelease,
    processRefund,

    // Utility functions
    validatePayment,
    checkDailyLimit,
    getEstimatedFees,
    retryPayment,
    cancelPayment,

    // Status functions
    reset,
    getStatusDisplay,
  };
};