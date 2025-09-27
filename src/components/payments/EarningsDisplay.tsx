/**
 * EarningsDisplay Component
 * Comprehensive user earnings dashboard with statistics and charts
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  BarChart3,
  Award,
  Target,
  Clock,
  Coins,
  Download,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { useAuth, usePayments, useDashboard } from '@/stores';
import { Payment, RewardCurrency, TaskType } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface EarningsDisplayProps {
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  showBreakdown?: boolean;
  showCharts?: boolean;
  compact?: boolean;
  className?: string;
}

interface EarningsStats {
  totalEarned: number;
  currentMonth: number;
  previousMonth: number;
  monthlyGrowth: number;
  averagePerTask: number;
  tasksCompleted: number;
  pendingAmount: number;
  byCurrency: Record<RewardCurrency, number>;
  byTaskType: Record<TaskType, { amount: number; count: number }>;
  dailyBreakdown: Array<{ date: string; amount: number }>;
}

export const EarningsDisplay: React.FC<EarningsDisplayProps> = ({
  timeRange = '30d',
  showBreakdown = true,
  showCharts = true,
  compact = false,
  className,
}) => {
  const { user } = useAuth();
  const { payments } = usePayments();
  const { userStats, loading } = useDashboard();

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [showDetails, setShowDetails] = useState(!compact);
  const [currencyFilter, setCurrencyFilter] = useState<RewardCurrency | 'all'>('all');

  // Calculate earnings statistics
  const earningsStats = useMemo((): EarningsStats => {
    if (!payments.length) {
      return {
        totalEarned: user?.total_earned || 0,
        currentMonth: 0,
        previousMonth: 0,
        monthlyGrowth: 0,
        averagePerTask: 0,
        tasksCompleted: 0,
        pendingAmount: 0,
        byCurrency: { WLD: 0, ETH: 0, USDC: 0 },
        byTaskType: {} as Record<TaskType, { amount: number; count: number }>,
        dailyBreakdown: []
      };
    }

    const now = new Date();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    const rangeStart = selectedTimeRange === 'all'
      ? new Date(0)
      : new Date(now.getTime() - timeRangeMs[selectedTimeRange]);

    // Filter payments by time range and user
    const userPayments = payments.filter(payment =>
      payment.recipient_id === user?.id &&
      payment.status === 'completed' &&
      new Date(payment.processed_at || payment.created_at) >= rangeStart
    );

    const pendingPayments = payments.filter(payment =>
      payment.recipient_id === user?.id &&
      payment.status === 'pending'
    );

    // Total earned in selected time range
    const totalEarned = userPayments.reduce((sum, payment) =>
      sum + (payment.net_amount || payment.amount), 0
    );

    // Current month earnings
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthPayments = userPayments.filter(payment =>
      new Date(payment.processed_at || payment.created_at) >= currentMonthStart
    );
    const currentMonth = currentMonthPayments.reduce((sum, payment) =>
      sum + (payment.net_amount || payment.amount), 0
    );

    // Previous month earnings
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const previousMonthPayments = userPayments.filter(payment => {
      const paymentDate = new Date(payment.processed_at || payment.created_at);
      return paymentDate >= previousMonthStart && paymentDate <= previousMonthEnd;
    });
    const previousMonth = previousMonthPayments.reduce((sum, payment) =>
      sum + (payment.net_amount || payment.amount), 0
    );

    // Monthly growth calculation
    const monthlyGrowth = previousMonth > 0
      ? ((currentMonth - previousMonth) / previousMonth) * 100
      : currentMonth > 0 ? 100 : 0;

    // Tasks completed
    const tasksCompleted = userPayments.length;

    // Average per task
    const averagePerTask = tasksCompleted > 0 ? totalEarned / tasksCompleted : 0;

    // Pending amount
    const pendingAmount = pendingPayments.reduce((sum, payment) =>
      sum + payment.amount, 0
    );

    // By currency breakdown
    const byCurrency = userPayments.reduce((acc, payment) => {
      const currency = payment.currency as RewardCurrency;
      acc[currency] = (acc[currency] || 0) + (payment.net_amount || payment.amount);
      return acc;
    }, { WLD: 0, ETH: 0, USDC: 0 } as Record<RewardCurrency, number>);

    // By task type breakdown (would need task data joined with payments)
    const byTaskType = {} as Record<TaskType, { amount: number; count: number }>;

    // Daily breakdown for the last 30 days
    const dailyBreakdown = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayPayments = userPayments.filter(payment => {
        const paymentDate = new Date(payment.processed_at || payment.created_at);
        return paymentDate.toISOString().split('T')[0] === dateStr;
      });
      const dayAmount = dayPayments.reduce((sum, payment) =>
        sum + (payment.net_amount || payment.amount), 0
      );
      dailyBreakdown.push({ date: dateStr, amount: dayAmount });
    }

    return {
      totalEarned,
      currentMonth,
      previousMonth,
      monthlyGrowth,
      averagePerTask,
      tasksCompleted,
      pendingAmount,
      byCurrency,
      byTaskType,
      dailyBreakdown
    };
  }, [payments, user, selectedTimeRange]);

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' }
  ];

  const currencyOptions = [
    { value: 'all', label: 'All Currencies' },
    { value: 'WLD', label: 'WLD' },
    { value: 'ETH', label: 'ETH' },
    { value: 'USDC', label: 'USDC' }
  ];

  const exportEarnings = () => {
    // Generate CSV export of earnings data
    const csvData = payments
      .filter(p => p.recipient_id === user?.id && p.status === 'completed')
      .map(p => ({
        Date: new Date(p.processed_at || p.created_at).toLocaleDateString(),
        Amount: p.net_amount || p.amount,
        Currency: p.currency,
        Type: p.payment_type,
        'Transaction Hash': p.transaction_hash || '',
      }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${selectedTimeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading.dashboard_stats) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Earnings Dashboard</h2>

          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as typeof timeRange)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={exportEarnings}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earned */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Total Earned</p>
              <p className="text-2xl font-bold text-white">
                ${earningsStats.totalEarned.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>

        {/* Monthly Growth */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Monthly Growth</p>
              <p className="text-2xl font-bold text-white">
                {earningsStats.monthlyGrowth > 0 ? '+' : ''}
                {earningsStats.monthlyGrowth.toFixed(1)}%
              </p>
            </div>
            <div className={cn(
              'p-3 rounded-lg',
              earningsStats.monthlyGrowth >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            )}>
              {earningsStats.monthlyGrowth >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-400" />
              )}
            </div>
          </div>
        </Card>

        {/* Tasks Completed */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Tasks Completed</p>
              <p className="text-2xl font-bold text-white">
                {earningsStats.tasksCompleted}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Average per Task */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Avg per Task</p>
              <p className="text-2xl font-bold text-white">
                ${earningsStats.averagePerTask.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Award className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      {showDetails && showBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currency Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Earnings by Currency
            </h3>
            <div className="space-y-3">
              {Object.entries(earningsStats.byCurrency).map(([currency, amount]) => (
                <div key={currency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{currency}</Badge>
                  </div>
                  <span className="font-semibold text-white">
                    {formatCurrency(amount, currency as RewardCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Performance
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">This Month</span>
                <span className="font-semibold text-white">
                  ${earningsStats.currentMonth.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Last Month</span>
                <span className="font-semibold text-white">
                  ${earningsStats.previousMonth.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Pending</span>
                <span className="font-semibold text-yellow-400">
                  ${earningsStats.pendingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {showDetails && showCharts && earningsStats.dailyBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Daily Earnings Trend (Last 30 Days)
          </h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {earningsStats.dailyBreakdown.map((day, index) => {
              const maxAmount = Math.max(...earningsStats.dailyBreakdown.map(d => d.amount));
              const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;

              return (
                <div
                  key={day.date}
                  className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 transition-colors relative group"
                  style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                  title={`${day.date}: $${day.amount.toFixed(2)}`}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString()}: ${day.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EarningsDisplay;