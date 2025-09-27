/**
 * usePayments Hook
 * Comprehensive payment data management and API interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { usePayments as usePaymentsStore, useAuth, useUI } from '@/stores';
import { Payment, PaymentType, PaymentStatus, RewardCurrency } from '@/types';

interface UsePaymentsReturn {
  // Payment data
  payments: Payment[];
  pendingPayments: Payment[];
  isLoading: boolean;
  error: string | null;

  // Fetch functions
  fetchPayments: (filters?: PaymentFilters) => Promise<void>;
  fetchPaymentById: (id: string) => Promise<Payment | null>;
  refreshPayments: () => Promise<void>;

  // Create and update functions
  createPayment: (data: CreatePaymentData) => Promise<Payment>;
  confirmPayment: (id: string, data: ConfirmPaymentData) => Promise<Payment>;
  cancelPayment: (id: string) => Promise<void>;

  // Utility functions
  getPaymentsByTask: (taskId: string) => Payment[];
  getPaymentsBySubmission: (submissionId: string) => Payment[];
  getUserEarnings: (timeRange?: string) => PaymentStats;
  exportPayments: (format?: 'csv' | 'json') => void;

  // Real-time updates
  subscribeToPaymentUpdates: () => () => void;
}

interface PaymentFilters {
  type?: PaymentType | 'all';
  status?: PaymentStatus | 'all';
  direction?: 'sent' | 'received' | 'all';
  currency?: RewardCurrency | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  limit?: number;
  offset?: number;
}

interface CreatePaymentData {
  task_id?: string;
  submission_id?: string;
  recipient_id?: string;
  amount: number;
  currency?: RewardCurrency;
  payment_type: PaymentType;
  description?: string;
}

interface ConfirmPaymentData {
  transaction_hash?: string;
  status: 'completed' | 'failed' | 'cancelled';
  gas_fee?: number;
  platform_fee?: number;
  failure_reason?: string;
  minikit_transaction_id?: string;
  block_number?: number;
  confirmations?: number;
}

interface PaymentStats {
  totalEarned: number;
  totalSpent: number;
  netEarnings: number;
  transactionCount: number;
  averageAmount: number;
  byCurrency: Record<RewardCurrency, number>;
  byStatus: Record<PaymentStatus, number>;
  monthlyTrend: Array<{ month: string; amount: number }>;
}

export const usePayments = (): UsePaymentsReturn => {
  const { user } = useAuth();
  const { addNotification } = useUI();
  const {
    payments,
    pendingPayments,
    loading,
    errors,
    setPayments,
    addPayment,
    updatePayment,
    setPendingPayments,
    setPaymentLoading,
    setPaymentError,
  } = usePaymentsStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch payments with optional filters
  const fetchPayments = useCallback(async (filters: PaymentFilters = {}) => {
    if (!user) return;

    const loadingKey = 'fetch';
    setPaymentLoading(loadingKey, true);
    setPaymentError(loadingKey, null);

    try {
      const searchParams = new URLSearchParams();

      // Apply filters to query params
      if (filters.type && filters.type !== 'all') {
        searchParams.append('payment_type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        searchParams.append('status', filters.status);
      }
      if (filters.direction && filters.direction !== 'all') {
        searchParams.append('type', filters.direction);
      }
      if (filters.currency && filters.currency !== 'all') {
        searchParams.append('currency', filters.currency);
      }
      if (filters.limit) {
        searchParams.append('limit', filters.limit.toString());
      }
      if (filters.offset) {
        searchParams.append('offset', filters.offset.toString());
      }

      const response = await fetch(`/api/payments?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();

      if (data.success) {
        setPayments(data.payments);

        // Set pending payments separately
        const pending = data.payments.filter((p: Payment) => p.status === 'pending');
        setPendingPayments(pending);
      } else {
        throw new Error(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch payments';
      setPaymentError(loadingKey, errorMsg);
      addNotification({
        type: 'error',
        title: 'Payment Fetch Error',
        message: errorMsg,
      });
    } finally {
      setPaymentLoading(loadingKey, false);
    }
  }, [user, setPayments, setPendingPayments, setPaymentLoading, setPaymentError, addNotification]);

  // Fetch single payment by ID
  const fetchPaymentById = useCallback(async (id: string): Promise<Payment | null> => {
    if (!user) return null;

    const loadingKey = `fetch_${id}`;
    setPaymentLoading(loadingKey, true);

    try {
      const response = await fetch(`/api/payments/${id}/confirm`);

      if (!response.ok) {
        throw new Error('Payment not found');
      }

      const data = await response.json();

      if (data.success) {
        return data.payment;
      } else {
        throw new Error(data.error || 'Failed to fetch payment');
      }
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      return null;
    } finally {
      setPaymentLoading(loadingKey, false);
    }
  }, [user, setPaymentLoading]);

  // Refresh payments
  const refreshPayments = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPayments();
    setIsRefreshing(false);
  }, [fetchPayments]);

  // Create new payment
  const createPayment = useCallback(async (data: CreatePaymentData): Promise<Payment> => {
    const loadingKey = 'create';
    setPaymentLoading(loadingKey, true);
    setPaymentError(loadingKey, null);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const result = await response.json();

      if (result.success) {
        const payment = result.payment;
        addPayment(payment);

        addNotification({
          type: 'success',
          title: 'Payment Created',
          message: `Payment for ${data.amount} ${data.currency || 'WLD'} created successfully`,
        });

        return payment;
      } else {
        throw new Error(result.error || 'Failed to create payment');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create payment';
      setPaymentError(loadingKey, errorMsg);
      throw error;
    } finally {
      setPaymentLoading(loadingKey, false);
    }
  }, [addPayment, setPaymentLoading, setPaymentError, addNotification]);

  // Confirm payment
  const confirmPayment = useCallback(async (id: string, data: ConfirmPaymentData): Promise<Payment> => {
    const loadingKey = `confirm_${id}`;
    setPaymentLoading(loadingKey, true);

    try {
      const response = await fetch(`/api/payments/${id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm payment');
      }

      const result = await response.json();

      if (result.success) {
        const payment = result.payment;
        updatePayment(id, payment);

        addNotification({
          type: data.status === 'completed' ? 'success' : 'error',
          title: `Payment ${data.status}`,
          message: `Payment has been ${data.status}`,
        });

        return payment;
      } else {
        throw new Error(result.error || 'Failed to confirm payment');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to confirm payment';
      addNotification({
        type: 'error',
        title: 'Payment Confirmation Error',
        message: errorMsg,
      });
      throw error;
    } finally {
      setPaymentLoading(loadingKey, false);
    }
  }, [updatePayment, setPaymentLoading, addNotification]);

  // Cancel payment
  const cancelPayment = useCallback(async (id: string): Promise<void> => {
    await confirmPayment(id, {
      status: 'cancelled',
      failure_reason: 'Cancelled by user',
    });
  }, [confirmPayment]);

  // Get payments by task
  const getPaymentsByTask = useCallback((taskId: string): Payment[] => {
    return payments.filter(payment => payment.task_id === taskId);
  }, [payments]);

  // Get payments by submission
  const getPaymentsBySubmission = useCallback((submissionId: string): Payment[] => {
    return payments.filter(payment => payment.submission_id === submissionId);
  }, [payments]);

  // Get user earnings statistics
  const getUserEarnings = useCallback((timeRange?: string): PaymentStats => {
    if (!user) {
      return {
        totalEarned: 0,
        totalSpent: 0,
        netEarnings: 0,
        transactionCount: 0,
        averageAmount: 0,
        byCurrency: { WLD: 0, ETH: 0, USDC: 0 },
        byStatus: { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 },
        monthlyTrend: []
      };
    }

    const userPayments = payments.filter(p =>
      p.recipient_id === user.id || p.payer_id === user.id
    );

    const earned = userPayments
      .filter(p => p.recipient_id === user.id && p.status === 'completed')
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const spent = userPayments
      .filter(p => p.payer_id === user.id && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const byCurrency = userPayments.reduce((acc, payment) => {
      if (payment.recipient_id === user.id && payment.status === 'completed') {
        acc[payment.currency] += payment.net_amount || payment.amount;
      }
      return acc;
    }, { WLD: 0, ETH: 0, USDC: 0 } as Record<RewardCurrency, number>);

    const byStatus = userPayments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    // Generate monthly trend data
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toISOString().slice(0, 7);

      const monthEarnings = userPayments
        .filter(p =>
          p.recipient_id === user.id &&
          p.status === 'completed' &&
          p.processed_at &&
          p.processed_at.startsWith(monthKey)
        )
        .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

      monthlyTrend.push({ month: monthKey, amount: monthEarnings });
    }

    return {
      totalEarned: earned,
      totalSpent: spent,
      netEarnings: earned - spent,
      transactionCount: userPayments.length,
      averageAmount: userPayments.length > 0 ? earned / userPayments.length : 0,
      byCurrency,
      byStatus: {
        pending: byStatus.pending || 0,
        processing: byStatus.processing || 0,
        completed: byStatus.completed || 0,
        failed: byStatus.failed || 0,
        cancelled: byStatus.cancelled || 0,
      },
      monthlyTrend
    };
  }, [payments, user]);

  // Export payments
  const exportPayments = useCallback((format: 'csv' | 'json' = 'csv') => {
    const userPayments = payments.filter(p =>
      p.recipient_id === user?.id || p.payer_id === user?.id
    );

    if (format === 'csv') {
      const csvHeaders = [
        'Date',
        'Type',
        'Direction',
        'Amount',
        'Currency',
        'Status',
        'Transaction Hash',
        'Payment ID'
      ];

      const csvData = userPayments.map(p => [
        new Date(p.created_at).toLocaleDateString(),
        p.payment_type,
        p.recipient_id === user?.id ? 'received' : 'sent',
        p.amount,
        p.currency,
        p.status,
        p.transaction_hash || '',
        p.external_payment_id || p.id
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonData = JSON.stringify(userPayments, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [payments, user]);

  // Subscribe to payment updates (WebSocket or polling)
  const subscribeToPaymentUpdates = useCallback(() => {
    const interval = setInterval(() => {
      if (pendingPayments.length > 0) {
        refreshPayments();
      }
    }, 30000); // Poll every 30 seconds for pending payments

    return () => clearInterval(interval);
  }, [pendingPayments, refreshPayments]);

  // Load payments on mount
  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, fetchPayments]);

  // Subscribe to payment updates
  useEffect(() => {
    const unsubscribe = subscribeToPaymentUpdates();
    return unsubscribe;
  }, [subscribeToPaymentUpdates]);

  return {
    // Payment data
    payments,
    pendingPayments,
    isLoading: loading.payment_fetch || isRefreshing,
    error: errors.payment_fetch,

    // Fetch functions
    fetchPayments,
    fetchPaymentById,
    refreshPayments,

    // Create and update functions
    createPayment,
    confirmPayment,
    cancelPayment,

    // Utility functions
    getPaymentsByTask,
    getPaymentsBySubmission,
    getUserEarnings,
    exportPayments,

    // Real-time updates
    subscribeToPaymentUpdates,
  };
};