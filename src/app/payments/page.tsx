/**
 * Payments Page
 * Comprehensive payment history and earnings dashboard
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Typography,
  Button,
  ListItem,
  Tabs,
  TabItem,
  Chip,
  SearchField,
  Skeleton,
  SkeletonTypography,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  FileText,
  ExternalLink,
  Mail,
  HelpCircle,
  User,
  Settings as SettingsIcon
} from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PaymentFilters {
  type: 'all' | 'sent' | 'received';
  status: 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_type: 'all' | 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
  currency: 'all' | 'WLD' | 'ETH' | 'USDC';
}

export default function PaymentsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    payments,
    stats,
    isLoading,
    error,
    hasMore,
    fetchPayments,
    loadMore,
    refreshStats,
    clearError
  } = usePayments();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const [filters, setFilters] = useState<PaymentFilters>({
    type: 'all',
    status: 'all',
    payment_type: 'all',
    currency: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters to fetch payments
  useEffect(() => {
    const apiFilters: any = {};

    if (filters.type !== 'all') apiFilters.type = filters.type;
    if (filters.status !== 'all') apiFilters.status = filters.status;
    if (filters.payment_type !== 'all') apiFilters.payment_type = filters.payment_type;
    if (searchQuery) apiFilters.search = searchQuery;

    fetchPayments(apiFilters);
  }, [filters, searchQuery, fetchPayments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getDirectionIcon = (payment: any) => {
    return payment.is_recipient ? (
      <ArrowDownLeft className="w-4 h-4 text-green-400" />
    ) : (
      <ArrowUpRight className="w-4 h-4 text-red-400" />
    );
  };

  const handleExport = () => {
    const csvHeaders = [
      'Date',
      'Type',
      'Direction',
      'Amount',
      'Currency',
      'Status',
      'Transaction Hash',
      'Description'
    ];

    const csvData = payments.map(payment => [
      formatDate(payment.created_at),
      payment.payment_type,
      payment.is_recipient ? 'Received' : 'Sent',
      payment.amount,
      payment.currency,
      payment.status,
      payment.transaction_hash || '',
      payment.task_title || `${payment.payment_type} payment`
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
  };

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
            <Typography variant="caption" className="text-white/60">
              Total Earned
            </Typography>
          </div>
          <Typography variant="h3" className="text-white">
            {stats ? formatCurrency(stats.total_earned, 'WLD') : '—'}
          </Typography>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-yellow-400 mr-2" />
            <Typography variant="caption" className="text-white/60">
              Pending
            </Typography>
          </div>
          <Typography variant="h3" className="text-white">
            {stats ? formatCurrency(stats.pending_earnings, 'WLD') : '—'}
          </Typography>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="w-5 h-5 text-blue-400 mr-2" />
            <Typography variant="caption" className="text-white/60">
              This Month
            </Typography>
          </div>
          <Typography variant="h3" className="text-white">
            {stats ? formatCurrency(stats.this_month, 'WLD') : '—'}
          </Typography>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center mb-2">
            <TrendingDown className="w-5 h-5 text-gray-400 mr-2" />
            <Typography variant="caption" className="text-white/60">
              Transactions
            </Typography>
          </div>
          <Typography variant="h3" className="text-white">
            {stats ? stats.transaction_count : '—'}
          </Typography>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h4" className="text-white">
            Recent Payments
          </Typography>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setActiveTab('history')}
          >
            View All
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <SkeletonTypography className="w-24 mb-1" />
                  <SkeletonTypography className="w-16" />
                </div>
                <SkeletonTypography className="w-20" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <Typography variant="body2" className="text-white/60">
              No payments yet
            </Typography>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 5).map((payment) => (
              <ListItem
                key={payment.id}
                icon={getDirectionIcon(payment)}
                title={payment.task_title || `${payment.payment_type} payment`}
                subtitle={`${payment.is_recipient ? '+' : '-'}${formatCurrency(payment.amount, payment.currency)} • ${formatRelativeTime(payment.created_at)}`}
                rightContent={
                  <Chip
                    variant={getStatusColor(payment.status) as any}
                    size="small"
                  >
                    {payment.status}
                  </Chip>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h4" className="text-white">
            Payment History
          </Typography>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={handleExport}
              disabled={payments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Typography variant="caption" className="text-white/60 mb-2 block">
                Direction
              </Typography>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All</option>
                <option value="received">Received</option>
                <option value="sent">Sent</option>
              </select>
            </div>

            <div>
              <Typography variant="caption" className="text-white/60 mb-2 block">
                Status
              </Typography>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}

        <SearchField
          placeholder="Search payments..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full"
        />
      </div>

      {/* Payment List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <SkeletonTypography className="w-32 mb-1" />
                  <SkeletonTypography className="w-24" />
                </div>
                <div className="text-right">
                  <SkeletonTypography className="w-20 mb-1" />
                  <SkeletonTypography className="w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <Typography variant="body2" className="text-white/60 mb-4">
              {error}
            </Typography>
            <Button variant="secondary" onClick={clearError}>
              Retry
            </Button>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <Typography variant="body2" className="text-white/60">
              No payments found
            </Typography>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    {getDirectionIcon(payment)}
                    <div>
                      <Typography variant="body2" className="text-white font-medium">
                        {payment.task_title || `${payment.payment_type} payment`}
                      </Typography>
                      <div className="flex items-center space-x-2">
                        <Typography variant="caption" className="text-white/60">
                          {formatDate(payment.created_at)}
                        </Typography>
                        {payment.transaction_hash && (
                          <Typography variant="caption" className="text-blue-400">
                            #{payment.transaction_hash.slice(0, 8)}...
                          </Typography>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Typography
                        variant="body2"
                        className={`font-medium ${payment.is_recipient ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {payment.is_recipient ? '+' : '-'}{formatCurrency(payment.amount, payment.currency)}
                      </Typography>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <Typography variant="caption" className="text-white/60 capitalize">
                        {payment.status}
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      {/* Account Settings */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <Typography variant="h4" className="text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Account Settings
        </Typography>

        <div className="space-y-3">
          <ListItem
            icon={<Shield className="w-5 h-5 text-blue-400" />}
            title="Privacy Policy"
            subtitle="How we collect, use, and protect your data"
            rightContent={<ExternalLink className="w-4 h-4 text-white/60" />}
            onClick={() => router.push('/privacy')}
            className="cursor-pointer hover:bg-white/5"
          />

          <ListItem
            icon={<FileText className="w-5 h-5 text-blue-400" />}
            title="Terms of Service"
            subtitle="Usage terms and conditions"
            rightContent={<ExternalLink className="w-4 h-4 text-white/60" />}
            onClick={() => router.push('/terms')}
            className="cursor-pointer hover:bg-white/5"
          />
        </div>
      </div>

      {/* Support */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <Typography variant="h4" className="text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Support
        </Typography>

        <div className="space-y-3">
          <ListItem
            icon={<Mail className="w-5 h-5 text-green-400" />}
            title="Contact Support"
            subtitle="support@worldhuman.studio"
            rightContent={<ExternalLink className="w-4 h-4 text-white/60" />}
            onClick={() => window.open('mailto:support@worldhuman.studio', '_blank')}
            className="cursor-pointer hover:bg-white/5"
          />

          <ListItem
            icon={<Shield className="w-5 h-5 text-blue-400" />}
            title="Privacy Concerns"
            subtitle="privacy@worldhuman.studio"
            rightContent={<ExternalLink className="w-4 h-4 text-white/60" />}
            onClick={() => window.open('mailto:privacy@worldhuman.studio', '_blank')}
            className="cursor-pointer hover:bg-white/5"
          />
        </div>
      </div>

      {/* App Information */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <Typography variant="h4" className="text-white mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          App Information
        </Typography>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Typography variant="body2" className="text-white/60">
              Version
            </Typography>
            <Typography variant="body2" className="text-white">
              1.0.0
            </Typography>
          </div>

          <div className="flex justify-between items-center">
            <Typography variant="body2" className="text-white/60">
              World App Integration
            </Typography>
            <Chip variant="success" size="small">
              Active
            </Chip>
          </div>

          <div className="flex justify-between items-center">
            <Typography variant="body2" className="text-white/60">
              Support Contact
            </Typography>
            <Typography variant="body2" className="text-white">
              support@worldhuman.studio
            </Typography>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <Typography variant="h4" className="text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Data & Privacy
        </Typography>

        <div className="space-y-3">
          <Typography variant="body2" className="text-white/60 mb-3">
            Your privacy matters to us. We follow strict data minimization principles and only collect information necessary for platform functionality.
          </Typography>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <Typography variant="body2" className="text-white/80">
                World ID verification (anonymized)
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <Typography variant="body2" className="text-white/80">
                Task submissions for AI training
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <Typography variant="body2" className="text-white/80">
                Secure payment processing
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <Typography variant="body2" className="text-white/80">
                No unnecessary data collection
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="w-full max-w-md mx-auto px-6 py-8 space-y-6">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-3">
          <Typography variant="caption" className="text-[var(--color-accent-blue)] tracking-[0.28em] uppercase">
            Wallet
          </Typography>
          <Typography variant="h2" className="text-[var(--color-text-primary)]">
            Payments
          </Typography>
          <Typography variant="body2" className="text-[color-mix(in srgb,var(--color-text-secondary) 90%,transparent)]">
            Track your earnings, transfers, and pending releases in one place.
          </Typography>
          <div className="pt-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabItem value="overview">Overview</TabItem>
              <TabItem value="history">History</TabItem>
              <TabItem value="settings">Settings</TabItem>
            </Tabs>
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </SafeAreaView>
  );
}
