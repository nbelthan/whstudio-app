'use client';

import { useState } from 'react';
import { SafeAreaView } from '@worldcoin/mini-apps-ui-kit-react';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BottomTabs from '@/components/Navigation/BottomTabs';
import { cn, formatCurrency, formatTimeAgo } from '@/lib/utils';
import { useSubmissions } from '@/hooks/useSubmissions';
import { SubmissionStatus } from '@/lib/types/submissions';

const filters: Array<{ label: string; value: SubmissionStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Approved', value: 'approved' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Rejected', value: 'rejected' },
];

const statusConfig: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' }>
  = {
    approved: { label: 'Approved', variant: 'success' },
    pending: { label: 'Pending', variant: 'warning' },
    under_review: { label: 'Under Review', variant: 'info' },
    rejected: { label: 'Rejected', variant: 'error' },
  };

export default function SubmissionsPage() {
  const [selected, setSelected] = useState<SubmissionStatus | 'all'>('all');
  const {
    submissions,
    stats,
    loading,
    error,
    refetch,
  } = useSubmissions({ status: selected, limit: 20 });

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] pb-32">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
              Submissions
            </p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[var(--color-accent-blue)]"
            >
              Refresh
              <RefreshCw className={loading ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
            </button>
          </div>
          <h1 className="text-3xl font-semibold">Quality at a glance</h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Review task outcomes, settlement status, and boost progress for your verified work.
          </p>
        </header>

        {stats && (
          <Card variant="elevated" padding="lg" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-text-secondary)] mb-1">
                  Lifetime earnings
                </p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(stats.total_earnings || 0, 'WLD')}
                </p>
              </div>
              <Badge variant="primary" size="sm" leftIcon={<ShieldCheck className="h-3 w-3" />}>
                Verified
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-[var(--color-bg-raised)] px-3 py-3 space-y-1">
                <p className="text-[var(--color-text-secondary)]">Approved</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {stats.approved_count ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-bg-raised)] px-3 py-3 space-y-1">
                <p className="text-[var(--color-text-secondary)]">Pending</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {stats.pending_count ?? 0}
                </p>
              </div>
            </div>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {filters.map((filter) => {
              const isActive = selected === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelected(filter.value)}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-medium border transition-colors duration-150',
                    isActive
                      ? 'border-[var(--color-accent-blue)] bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] text-[var(--color-accent-blue)]'
                      : 'border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {error && (
            <Card variant="default" padding="lg" className="border-[color-mix(in srgb,var(--color-error) 35%,transparent)] bg-[color-mix(in srgb,var(--color-error) 12%,transparent)]">
              <div className="flex items-center gap-3 text-sm text-[var(--color-error)]">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {loading && !submissions.length && (
              <Card variant="default" padding="lg">
                <p className="text-xs text-[var(--color-text-secondary)]">Loading submissions…</p>
              </Card>
            )}

            {!loading && !submissions.length && (
              <Card variant="default" padding="lg" className="text-center space-y-2">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[var(--color-text-secondary)]" />
                <p className="text-sm font-semibold">No submissions yet</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Complete a task to see it appear here.</p>
              </Card>
            )}

            {submissions.map((submission) => {
              const config = statusConfig[submission.status] ?? statusConfig.pending;
              return (
                <Card key={submission.id} variant="default" padding="lg" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {submission.task?.title ?? 'Task submission'}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Submitted {formatTimeAgo(submission.created_at)}
                      </p>
                    </div>
                    <Badge variant={config.variant} size="sm">
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Reviewed {submission.reviewed_at ? formatTimeAgo(submission.reviewed_at) : 'pending'}
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-success)]">
                      {submission.reward_amount
                        ? `+${formatCurrency(submission.reward_amount, submission.reward_currency)}`
                        : '--'}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
      <BottomTabs />
    </SafeAreaView>
  );
}
