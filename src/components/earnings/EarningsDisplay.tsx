/**
 * Enhanced EarningsDisplay Component
 * Comprehensive user earnings dashboard with animated counters,
 * mobile-first design using World App UI Kit, and proper error handling
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Coins,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  Target,
  History,
} from 'lucide-react';

// World App UI Kit imports
import {
  Button,
  Typography,
  Spinner,
  Chip,
  Progress,
  SafeAreaView,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Tabs,
  TabItem,
  Skeleton,
  SkeletonTypography,
  useToast,
} from '@/components/ui-kit';

// Internal imports
import { Card } from '@/components/ui';
import { useAuth, usePayments, useDashboard } from '@/stores';
import { Payment, RewardCurrency, TaskType } from '@/types';
import { formatCurrency, formatTimeAgo, cn } from '@/lib/utils';

// Enhanced interfaces for earnings data
interface EarningsBreakdown {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  pending: number;
  confirmed: number;
}

interface CurrencyBreakdown {
  WLD: {
    amount: number;
    percentage: number;
    change24h: number;
  };
  USDC: {
    amount: number;
    percentage: number;
    change24h: number;
  };
  ETH: {
    amount: number;
    percentage: number;
    change24h: number;
  };
}

interface TransactionItem {
  id: string;
  amount: number;
  currency: RewardCurrency;
  type: 'reward' | 'bonus' | 'referral';
  status: 'confirmed' | 'pending' | 'failed';
  taskTitle?: string;
  timestamp: string;
  transactionHash?: string;
}

interface EarningsDisplayProps {
  userId?: string;
  showBreakdown?: boolean;
  showTransactions?: boolean;
  compact?: boolean;
  refreshInterval?: number;
  className?: string;
}

// Animated counter component
const AnimatedCounter: React.FC<{
  value: number;
  currency?: RewardCurrency;
  duration?: number;
  prefix?: string;
  suffix?: string;
}> = ({ value, currency, duration = 1000, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(value * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  const formatValue = (val: number) => {
    if (currency) {
      return formatCurrency(val, currency);
    }
    return `${prefix}${val.toFixed(currency === 'WLD' ? 4 : 2)}${suffix}`;
  };

  return (
    <span className="font-mono tabular-nums">
      {formatValue(displayValue)}
    </span>
  );
};

// Stat card component
const StatCard: React.FC<{
  title: string;
  value: number;
  currency?: RewardCurrency;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
  loading?: boolean;
}> = ({ title, value, currency, icon, trend, subtitle, loading }) => {
  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonTypography className="h-4 w-16" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <SkeletonTypography className="h-6 w-20" />
        {subtitle && <SkeletonTypography className="h-3 w-12" />}
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Typography variant="body-3" className="text-white/70 mb-1">
              {title}
            </Typography>
            <Typography variant="heading-2" className="text-white font-mono">
              <AnimatedCounter value={value} currency={currency} />
            </Typography>
            {subtitle && (
              <Typography variant="body-4" className="text-white/60 mt-1">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <div className="flex items-center mt-2 gap-1">
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <Typography
                  variant="body-4"
                  className={trend >= 0 ? 'text-green-400' : 'text-red-400'}
                >
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </Typography>
              </div>
            )}
          </div>
          <div className="ml-4 p-2 bg-white/10 rounded-lg">
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Transaction item component
const TransactionItem: React.FC<{
  transaction: TransactionItem;
  onViewDetails?: (transaction: TransactionItem) => void;
}> = ({ transaction, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-white/70';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reward': return <Award className="w-4 h-4" />;
      case 'bonus': return <Target className="w-4 h-4" />;
      case 'referral': return <Activity className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={() => onViewDetails?.(transaction)}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg">
          {getTypeIcon(transaction.type)}
        </div>
        <div>
          <Typography variant="body-2" className="text-white">
            {formatCurrency(transaction.amount, transaction.currency)}
          </Typography>
          <Typography variant="body-4" className="text-white/60">
            {transaction.taskTitle || `${transaction.type} payment`}
          </Typography>
        </div>
      </div>
      <div className="text-right">
        <Chip
          size="sm"
          variant={transaction.status === 'confirmed' ? 'success' :
                  transaction.status === 'pending' ? 'warning' : 'error'}
        >
          {transaction.status}
        </Chip>
        <Typography variant="body-4" className="text-white/60 mt-1">
          {formatTimeAgo(transaction.timestamp)}
        </Typography>
      </div>
    </motion.div>
  );
};

export const EarningsDisplay: React.FC<EarningsDisplayProps> = ({
  userId,
  showBreakdown = true,
  showTransactions = true,
  compact = false,
  refreshInterval = 30000,
  className,
}) => {
  const { user } = useAuth();
  const { payments, loading: paymentsLoading, fetchPayments } = usePayments();
  const { userStats, loading: statsLoading } = useDashboard();
  const { toast } = useToast();

  // State management
  const [showDetails, setShowDetails] = useState(!compact);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);

  // Auto-refresh functionality
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(async () => {
      try {
        await fetchPayments?.();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchPayments]);

  // Calculate earnings breakdown
  const earningsBreakdown = useMemo((): EarningsBreakdown => {
    const userPayments = payments.filter(p =>
      p.recipient_id === (userId || user?.id) && p.status === 'completed'
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const today = userPayments
      .filter(p => new Date(p.processed_at || p.created_at) >= todayStart)
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const thisWeek = userPayments
      .filter(p => new Date(p.processed_at || p.created_at) >= weekStart)
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const thisMonth = userPayments
      .filter(p => new Date(p.processed_at || p.created_at) >= monthStart)
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const allTime = userPayments
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const pending = payments
      .filter(p => p.recipient_id === (userId || user?.id) && p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      today,
      thisWeek,
      thisMonth,
      allTime,
      pending,
      confirmed: allTime,
    };
  }, [payments, userId, user?.id]);

  // Calculate currency breakdown
  const currencyBreakdown = useMemo((): CurrencyBreakdown => {
    const userPayments = payments.filter(p =>
      p.recipient_id === (userId || user?.id) && p.status === 'completed'
    );

    const totals = userPayments.reduce((acc, payment) => {
      const currency = payment.currency as RewardCurrency;
      acc[currency] = (acc[currency] || 0) + (payment.net_amount || payment.amount);
      return acc;
    }, { WLD: 0, USDC: 0, ETH: 0 } as Record<RewardCurrency, number>);

    const totalValue = Object.values(totals).reduce((sum, val) => sum + val, 0);

    // Calculate percentages and mock 24h changes
    const result: CurrencyBreakdown = {
      WLD: {
        amount: totals.WLD,
        percentage: totalValue > 0 ? (totals.WLD / totalValue) * 100 : 0,
        change24h: Math.random() * 10 - 5, // Mock data
      },
      USDC: {
        amount: totals.USDC,
        percentage: totalValue > 0 ? (totals.USDC / totalValue) * 100 : 0,
        change24h: Math.random() * 10 - 5, // Mock data
      },
      ETH: {
        amount: totals.ETH,
        percentage: totalValue > 0 ? (totals.ETH / totalValue) * 100 : 0,
        change24h: Math.random() * 10 - 5, // Mock data
      },
    };

    return result;
  }, [payments, userId, user?.id]);

  // Transform payments to transaction items
  const transactions = useMemo((): TransactionItem[] => {
    return payments
      .filter(p => p.recipient_id === (userId || user?.id))
      .map(payment => ({
        id: payment.id,
        amount: payment.net_amount || payment.amount,
        currency: payment.currency as RewardCurrency,
        type: payment.payment_type === 'task_reward' ? 'reward' : 'bonus',
        status: payment.status === 'completed' ? 'confirmed' :
                payment.status === 'pending' ? 'pending' : 'failed',
        timestamp: payment.processed_at || payment.created_at,
        transactionHash: payment.transaction_hash,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Show latest 20 transactions
  }, [payments, userId, user?.id]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPayments?.();
      toast({
        title: 'Refreshed',
        description: 'Earnings data updated successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh earnings data',
        variant: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const loading = paymentsLoading.payments || statsLoading.dashboard_stats;

  if (loading && !payments.length) {
    return (
      <SafeAreaView className={cn('p-4', className)}>
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <SkeletonTypography className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <SkeletonTypography className="h-4 w-16 mb-2" />
                  <SkeletonTypography className="h-6 w-20" />
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn('p-4 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Typography variant="heading-1" className="text-white">
          Earnings
        </Typography>
        <div className="flex items-center gap-2">
          {!compact && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Earned"
          value={earningsBreakdown.allTime}
          currency="USDC"
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          loading={loading}
        />
        <StatCard
          title="This Month"
          value={earningsBreakdown.thisMonth}
          currency="USDC"
          icon={<Calendar className="w-5 h-5 text-blue-400" />}
          loading={loading}
        />
        <StatCard
          title="Pending"
          value={earningsBreakdown.pending}
          currency="USDC"
          icon={<Clock className="w-5 h-5 text-yellow-400" />}
          loading={loading}
        />
        <StatCard
          title="Tasks Done"
          value={userStats?.tasks_completed || 0}
          icon={<Target className="w-5 h-5 text-purple-400" />}
          loading={loading}
        />
      </div>

      {/* Detailed Breakdown */}
      {showDetails && showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="p-4">
            <Tabs defaultValue="overview" onValueChange={setSelectedTab}>
              <div className="flex space-x-1 mb-4">
                <TabItem value="overview">Overview</TabItem>
                <TabItem value="currencies">Currencies</TabItem>
                {showTransactions && <TabItem value="transactions">Recent</TabItem>}
              </div>

              <AnimatePresence mode="wait">
                {selectedTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Typography variant="body-3" className="text-white/70">
                          Today
                        </Typography>
                        <Typography variant="heading-3" className="text-white font-mono">
                          <AnimatedCounter
                            value={earningsBreakdown.today}
                            currency="USDC"
                          />
                        </Typography>
                      </div>
                      <div className="space-y-2">
                        <Typography variant="body-3" className="text-white/70">
                          This Week
                        </Typography>
                        <Typography variant="heading-3" className="text-white font-mono">
                          <AnimatedCounter
                            value={earningsBreakdown.thisWeek}
                            currency="USDC"
                          />
                        </Typography>
                      </div>
                    </div>
                  </motion.div>
                )}

                {selectedTab === 'currencies' && (
                  <motion.div
                    key="currencies"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {(Object.entries(currencyBreakdown) as [RewardCurrency, any][]).map(([currency, data]) => (
                      <div key={currency} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                            <Typography variant="body-3" className="text-white font-semibold">
                              {currency}
                            </Typography>
                          </div>
                          <div>
                            <Typography variant="body-2" className="text-white font-mono">
                              <AnimatedCounter value={data.amount} currency={currency} />
                            </Typography>
                            <Typography variant="body-4" className="text-white/60">
                              {data.percentage.toFixed(1)}% of total
                            </Typography>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {data.change24h >= 0 ? (
                              <TrendingUp className="w-3 h-3 text-green-400" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-400" />
                            )}
                            <Typography
                              variant="body-4"
                              className={data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}
                            >
                              {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(1)}%
                            </Typography>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {selectedTab === 'transactions' && showTransactions && (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {transactions.length > 0 ? (
                      transactions.slice(0, 5).map((transaction) => (
                        <TransactionItem
                          key={transaction.id}
                          transaction={transaction}
                          onViewDetails={setSelectedTransaction}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <Typography variant="body-2" className="text-white/60">
                          No transactions yet
                        </Typography>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Tabs>
          </Card>
        </motion.div>
      )}

      {/* Transaction Details Drawer */}
      <Drawer open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Transaction Details</DrawerTitle>
          </DrawerHeader>
          {selectedTransaction && (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Typography variant="body-3" className="text-white/70">
                  Amount
                </Typography>
                <Typography variant="heading-2" className="text-white font-mono">
                  {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </Typography>
              </div>
              <div className="space-y-2">
                <Typography variant="body-3" className="text-white/70">
                  Status
                </Typography>
                <Chip variant={selectedTransaction.status === 'confirmed' ? 'success' : 'warning'}>
                  {selectedTransaction.status}
                </Chip>
              </div>
              <div className="space-y-2">
                <Typography variant="body-3" className="text-white/70">
                  Date
                </Typography>
                <Typography variant="body-2" className="text-white">
                  {new Date(selectedTransaction.timestamp).toLocaleString()}
                </Typography>
              </div>
              {selectedTransaction.transactionHash && (
                <div className="space-y-2">
                  <Typography variant="body-3" className="text-white/70">
                    Transaction Hash
                  </Typography>
                  <Typography variant="body-4" className="text-white/80 font-mono break-all">
                    {selectedTransaction.transactionHash}
                  </Typography>
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </SafeAreaView>
  );
};

export default EarningsDisplay;