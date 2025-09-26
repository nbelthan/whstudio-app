/**
 * Payment History Component
 * Displays user's payment transactions and earnings history
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Download, Filter, Search, ExternalLink } from 'lucide-react';

import { Card, Button, Badge, Input, LoadingSkeleton, Modal } from '@/components/ui';
import { usePayments, useAuth } from '@/stores';
import { Payment, PaymentType, PaymentStatus } from '@/types';
import {
  formatCurrency,
  formatTimeAgo,
  getStatusProps,
  cn,
} from '@/lib/utils';

interface PaymentHistoryProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

interface PaymentFilters {
  type?: PaymentType;
  status?: PaymentStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  limit,
  showFilters = true,
  className,
}) => {
  const { payments, loading, setPaymentLoading } = usePayments();
  const { user } = useAuth();

  const [filters, setFilters] = useState<PaymentFilters>({});
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch payments on mount
  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    if (!user) return;

    setPaymentLoading('fetch', true);

    try {
      const response = await fetch('/api/payments');
      if (response.ok) {
        const data = await response.json();
        // Payment data would be set via the store
        console.log('Payments fetched:', data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setPaymentLoading('fetch', false);
    }
  };

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(payment => payment.payment_type === filters.type);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(payment => payment.status === filters.status);
    }

    // Apply date range filter
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.transaction_hash?.toLowerCase().includes(query) ||
        payment.payment_type.toLowerCase().includes(query) ||
        payment.amount.toString().includes(query)
      );
    }

    // Limit results if specified
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [payments, filters, limit]);

  // Calculate totals
  const totals = useMemo(() => {
    const earned = filteredPayments
      .filter(p => p.recipient_id === user?.id && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const spent = filteredPayments
      .filter(p => p.payer_id === user?.id && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return { earned, spent, netEarnings: earned - spent };
  }, [filteredPayments, user]);

  const handlePaymentClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Transaction Hash'].join(','),
      ...filteredPayments.map(payment => [
        new Date(payment.created_at).toLocaleDateString(),
        payment.payment_type,
        payment.amount,
        payment.currency,
        payment.status,
        payment.transaction_hash || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPaymentTypeIcon = (type: PaymentType) => {
    switch (type) {
      case 'task_reward':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'escrow_deposit':
      case 'escrow_release':
        return <DollarSign className="w-4 h-4 text-blue-400" />;
      case 'refund':
        return <DollarSign className="w-4 h-4 text-yellow-400" />;
      default:
        return <DollarSign className="w-4 h-4 text-white/60" />;
    }
  };

  const getPaymentDirection = (payment: Payment) => {
    if (payment.recipient_id === user?.id) return 'received';
    if (payment.payer_id === user?.id) return 'sent';
    return 'unknown';
  };

  if (loading.fetch && payments.length === 0) {
    return (
      <Card className={className}>
        <Card.Header title="Payment History" />
        <Card.Content>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <LoadingSkeleton width={32} height={32} rounded />
                  <div>
                    <LoadingSkeleton width={120} height={16} />
                    <LoadingSkeleton width={80} height={12} className="mt-2" />
                  </div>
                </div>
                <LoadingSkeleton width={80} height={16} />
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card variant="elevated">
        <Card.Header
          title="Payment History"
          subtitle={`${filteredPayments.length} transactions`}
          action={
            <div className="flex gap-2">
              {showFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Filter className="w-4 h-4" />}
                >
                  Filters
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={exportPayments}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
            </div>
          }
        />

        <Card.Content>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Earned</span>
              </div>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(totals.earned, 'WLD')}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">Spent</span>
              </div>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(totals.spent, 'WLD')}
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">Net</span>
              </div>
              <p className={cn(
                'text-xl font-semibold',
                totals.netEarnings >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {formatCurrency(totals.netEarnings, 'WLD')}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          {showFilters && (
            <div className="mb-4">
              <Input
                placeholder="Search by transaction hash, type, or amount..."
                value={filters.searchQuery || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Payment List */}
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No payment history found</p>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const direction = getPaymentDirection(payment);
                const statusProps = getStatusProps(payment.status);

                return (
                  <div
                    key={payment.id}
                    onClick={() => handlePaymentClick(payment)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getPaymentTypeIcon(payment.payment_type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium capitalize">
                            {payment.payment_type.replace('_', ' ')}
                          </span>
                          <Badge
                            variant={direction === 'received' ? 'success' : 'info'}
                            size="sm"
                          >
                            {direction}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <span>{formatTimeAgo(payment.created_at)}</span>
                          {payment.transaction_hash && (
                            <>
                              <span>•</span>
                              <span className="font-mono">
                                {payment.transaction_hash.slice(0, 8)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={cn(
                        'font-semibold',
                        direction === 'received' ? 'text-green-400' : 'text-white'
                      )}>
                        {direction === 'received' ? '+' : '-'}
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <Badge
                        size="sm"
                        className={cn(statusProps.bgColor, statusProps.color)}
                      >
                        {statusProps.label}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Payment Details"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <span className="text-white/60 text-sm">Amount</span>
                <p className="text-white font-semibold text-lg">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <span className="text-white/60 text-sm">Status</span>
                <div className="mt-1">
                  <Badge className={cn(
                    getStatusProps(selectedPayment.status).bgColor,
                    getStatusProps(selectedPayment.status).color
                  )}>
                    {getStatusProps(selectedPayment.status).label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <span className="text-white/60 text-sm">Type</span>
              <p className="text-white capitalize">
                {selectedPayment.payment_type.replace('_', ' ')}
              </p>
            </div>

            {selectedPayment.transaction_hash && (
              <div className="bg-white/5 rounded-lg p-4">
                <span className="text-white/60 text-sm">Transaction Hash</span>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white font-mono text-sm">
                    {selectedPayment.transaction_hash}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ExternalLink className="w-3 h-3" />}
                    onClick={() => {
                      // Open blockchain explorer
                      const url = `https://optimistic.etherscan.io/tx/${selectedPayment.transaction_hash}`;
                      window.open(url, '_blank');
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <span className="text-white/60 text-sm">Created</span>
                <p className="text-white">
                  {new Date(selectedPayment.created_at).toLocaleString()}
                </p>
              </div>

              {selectedPayment.processed_at && (
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-white/60 text-sm">Processed</span>
                  <p className="text-white">
                    {new Date(selectedPayment.processed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {selectedPayment.gas_fee && (
              <div className="bg-white/5 rounded-lg p-4">
                <span className="text-white/60 text-sm">Network Fee</span>
                <p className="text-white">
                  {formatCurrency(selectedPayment.gas_fee, selectedPayment.currency)}
                </p>
              </div>
            )}
          </div>
        )}

        <Modal.Footer>
          <Button onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PaymentHistory;