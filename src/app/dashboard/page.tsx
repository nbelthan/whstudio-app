'use client';

import { useEffect, useMemo } from 'react';
import { SafeAreaView } from '@worldcoin/mini-apps-ui-kit-react';
import { Activity, ArrowUpRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BottomTabs from '@/components/Navigation/BottomTabs';
import { cn, formatCurrency } from '@/lib/utils';
import { useDashboard, useAuth } from '@/stores';

interface StatsSummary {
  weeklyEarnings: number;
  weeklyChange: number;
  isPositiveChange: boolean;
}

interface EarningsDatum {
  date: string;
  amount: number;
}

const heroCopy =
  'Track verified contributions, streak progress, and instant payouts from your WorldHuman tasks.';

const defaultSummary: StatsSummary = {
  weeklyEarnings: 0,
  weeklyChange: 0,
  isPositiveChange: true,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    userStats,
    earningsData,
    loading,
    setDashboardLoading,
    setDashboardError,
    setEarningsData,
    setUserStats,
  } = useDashboard();
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user) return;

      setDashboardLoading('stats', true);

      try {
        const mockStats = {
          total_earned: user.total_earned || 0,
          tasks_completed: Math.floor(Math.random() * 40) + 12,
          success_rate: Math.random() * 20 + 80,
          average_rating: Math.random() * 1 + 4,
          current_streak: Math.floor(Math.random() * 6) + 2,
        };

        const mockEarnings = {
          daily: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            amount: Math.random() * 45 + 8,
          })).reverse(),
        };

        setUserStats(mockStats);
        setEarningsData(mockEarnings);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setDashboardError('stats', 'Unable to load dashboard metrics');
      } finally {
        setDashboardLoading('stats', false);
      }
    };

    fetchDashboardStats();
  }, [user, setDashboardLoading, setDashboardError, setUserStats, setEarningsData]);

  const summary: StatsSummary = useMemo(() => {
    if (!earningsData?.daily?.length) {
      return defaultSummary;
    }

    const daily = earningsData.daily as EarningsDatum[];
    const thisWeek = daily.slice(-7);
    const lastWeek = daily.slice(-14, -7);

    const weeklyEarnings = thisWeek.reduce((sum, datum) => sum + datum.amount, 0);
    const previous = lastWeek.reduce((sum, datum) => sum + datum.amount, 0);
    const weeklyChange = previous > 0 ? ((weeklyEarnings - previous) / previous) * 100 : 0;

    return {
      weeklyEarnings,
      weeklyChange,
      isPositiveChange: weeklyChange >= 0,
    };
  }, [earningsData]);

  const streakPercentage = userStats ? Math.min(100, (userStats.current_streak / 14) * 100) : 0;

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] pb-32">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <header className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold">Welcome back{user?.username ? `, ${user.username}` : ''}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{heroCopy}</p>
        </header>

        <Card variant="elevated" padding="lg" className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
                Total Earned
              </p>
              <p className="text-3xl font-semibold">
                {formatCurrency(userStats?.total_earned || 0, 'WLD')}
              </p>
            </div>
            <Badge variant="primary" size="sm" leftIcon={<ShieldCheck className="h-3 w-3" />}>
              Verified
            </Badge>
          </div>

          <div className="rounded-2xl bg-[var(--color-bg-raised)] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">World ID Boost active</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {summary.weeklyChange >= 0 ? '+' : '-'}
                {Math.abs(summary.weeklyChange).toFixed(1)}% vs. last week
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-accent-blue)]">
              <Activity className="h-4 w-4" />
              View metrics
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Performance</h2>
            <Badge variant="ghost" size="sm">Last 7 days</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                Completion
              </div>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {userStats ? `${Math.round(userStats.success_rate)}%` : '—'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {userStats?.tasks_completed ?? 0} verified tasks
              </p>
            </Card>

            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <Clock className="h-4 w-4 text-[var(--color-accent-blue)]" />
                Streak
              </div>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {userStats?.current_streak ?? 0} days
              </p>
              <div className="h-2 rounded-full bg-[color-mix(in srgb,var(--color-divider-low) 50%,transparent)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-accent-blue)] transition-all"
                  style={{ width: `${streakPercentage}%` }}
                />
              </div>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link
              href="/submissions"
              className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent-blue)] flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <Card variant="default" className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3',
                  idx !== 2 && 'border-b border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] text-[var(--color-accent-blue)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      RLHF rating completed
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Settled 12 minutes ago
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-[var(--color-success)]">+0.85 WLD</p>
              </div>
            ))}
          </Card>
        </section>
      </div>
      <BottomTabs />
    </SafeAreaView>
  );
}
