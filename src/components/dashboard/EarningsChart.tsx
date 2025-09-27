/**
 * Earnings Chart Component
 * Displays earnings trends over time with interactive chart
 */

'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3 } from 'lucide-react';

import { Card, Button, Badge, LoadingSkeleton } from '@/components/ui';
import { useDashboard } from '@/stores';
import { formatCurrency, cn } from '@/lib/utils';

interface EarningsChartProps {
  className?: string;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly';

export const EarningsChart: React.FC<EarningsChartProps> = ({
  className,
}) => {
  const { earningsData, loading } = useDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('daily');

  // Get chart data based on selected period
  const chartData = useMemo(() => {
    if (!earningsData) return [];

    switch (selectedPeriod) {
      case 'daily':
        return earningsData.daily.map(day => ({
          label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
          value: day.amount,
          fullDate: day.date,
        }));
      case 'weekly':
        return earningsData.weekly.map(week => ({
          label: week.week,
          value: week.amount,
        }));
      case 'monthly':
        return earningsData.monthly.map(month => ({
          label: month.month,
          value: month.amount,
        }));
      default:
        return [];
    }
  }, [earningsData, selectedPeriod]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(item => item.value));
  }, [chartData]);

  // Calculate total and average
  const { total, average, trend } = useMemo(() => {
    if (chartData.length === 0) return { total: 0, average: 0, trend: 0 };

    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
    const averageValue = totalValue / chartData.length;

    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint).reduce((sum, item) => sum + item.value, 0) / midPoint;
    const secondHalf = chartData.slice(midPoint).reduce((sum, item) => sum + item.value, 0) / (chartData.length - midPoint);

    const trendValue = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return {
      total: totalValue,
      average: averageValue,
      trend: trendValue,
    };
  }, [chartData]);

  if (loading.dashboard_stats && !earningsData) {
    return (
      <Card className={className} variant="elevated">
        <Card.Header title="Earnings Trends" />
        <Card.Content>
          <div className="space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} width={80} height={32} />
              ))}
            </div>
            <LoadingSkeleton width="100%" height={200} />
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className={className} variant="elevated">
      <Card.Header
        title="Earnings Trends"
        subtitle={`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} earnings overview`}
        action={
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        }
      />

      <Card.Content>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[var(--color-bg-surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Total</span>
              </div>
              <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(total, 'WLD')}
              </p>
            </div>

            <div className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[var(--color-bg-surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-[var(--color-accent-blue)]" />
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Average</span>
              </div>
              <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(average, 'WLD')}
              </p>
            </div>

            <div className="rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[var(--color-bg-surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={cn(
                  'w-4 h-4',
                  trend >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                )} />
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Trend</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  'text-xl font-semibold',
                  trend >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                )}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </p>
                <Badge
                  variant={trend >= 0 ? 'success' : 'error'}
                  size="sm"
                >
                  {trend >= 0 ? 'Up' : 'Down'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Breakdown
              </h4>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {chartData.length} periods
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 rounded-2xl border border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)]">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-[color-mix(in srgb,var(--color-text-secondary) 40%,transparent)] mx-auto mb-3" />
                  <p className="text-xs text-[var(--color-text-secondary)]">No earnings data available</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chartData.map((item, index) => {
                  const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>{item.label}</span>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(item.value, 'WLD')}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-[color-mix(in srgb,var(--color-divider-low) 50%,transparent)] rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-[var(--color-accent-blue)]" style={{ width: `${percentage}%` }} />
                        </div>
                        {item.value > 0 && percentage > 25 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-primary)] font-medium"
                            style={{
                              left: `${Math.max(5, percentage - 20)}%`,
                              transform: 'translateY(-50%)',
                            }}
                          >
                            {formatCurrency(item.value, 'WLD')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Period Comparison */}
          {chartData.length > 1 && (
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Period Comparison</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Highest:</span>
                  <p className="text-white font-medium">
                    {formatCurrency(Math.max(...chartData.map(item => item.value)), 'WLD')}
                  </p>
                </div>
                <div>
                  <span className="text-white/60">Lowest:</span>
                  <p className="text-white font-medium">
                    {formatCurrency(Math.min(...chartData.map(item => item.value)), 'WLD')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EarningsChart;
