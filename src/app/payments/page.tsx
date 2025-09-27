'use client';

import { useMemo } from 'react';
import { SafeAreaView } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowDownLeft, ArrowUpRight, Clock, Download } from 'lucide-react';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BottomTabs from '@/components/navigation/BottomTabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePayments } from '@/hooks/usePayments';

const bannerCopy = 'Instant settlement streams straight to World App once submissions clear quality gates.';

export default function PaymentsPage() {
  const { payments, stats, isLoading, error, refreshStats } = usePayments();

  const totals = useMemo(() => {
    if (!stats) {
      return {
        total: 0,
        pending: 0,
        thisMonth: 0,
      };
    }

    return {
      total: stats.total_earned,
      pending: stats.pending_earnings,
      thisMonth: stats.this_month,
    };
  }, [stats]);

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] pb-32">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
              Payments
            </p>
            <button
              onClick={() => refreshStats()}
              className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent-blue)]"
            >
              Refresh
            </button>
          </div>
          <h1 className="text-3xl font-semibold">Verified settlements</h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{bannerCopy}</p>
        </header>

        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-text-secondary)] mb-1">
                Lifetime earned
              </p>
              <p className="text-2xl font-semibold">{formatCurrency(totals.total, 'WLD')}</p>
            </div>
            <button
              onClick={() => window.alert('CSV export coming soon')}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[var(--color-text-secondary)]"
            >
              <Download className="h-3 w-3" /> Export
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[var(--color-bg-raised)] px-4 py-3">
              <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-[0.2em] mb-1">
                Pending
              </p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(totals.pending, 'WLD')}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--color-bg-raised)] px-4 py-3">
              <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-[0.2em] mb-1">
                This month
              </p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(totals.thisMonth, 'WLD')}
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <Card variant="default" padding="lg" className="border-[color-mix(in srgb,var(--color-error) 35%,transparent)] bg-[color-mix(in srgb,var(--color-error) 12%,transparent)]">
            <p className="text-sm font-semibold text-[var(--color-error)] mb-1">{error}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Try refreshing or check connection.</p>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent transfers</h2>
            <Badge variant="primary" size="sm">{payments.length}</Badge>
          </div>
          <div className="space-y-3">
            {isLoading && !payments.length && (
              <Card variant="default" padding="lg">
                <p className="text-xs text-[var(--color-text-secondary)]">Loading payments…</p>
              </Card>
            )}
            {!isLoading && !payments.length && (
              <Card variant="default" padding="lg" className="text-center space-y-2">
                <Clock className="h-6 w-6 mx-auto text-[var(--color-text-secondary)]" />
                <p className="text-sm font-semibold">No payments yet</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Complete tasks to trigger instant settlement.
                </p>
              </Card>
            )}
            {payments.map((payment) => {
              const isIncoming = payment.is_recipient;
              return (
                <Card key={payment.id} variant="default" padding="lg" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {payment.task_title ?? payment.payment_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                    <Badge variant={isIncoming ? 'success' : 'error'} size="sm">
                      {isIncoming ? 'Received' : 'Sent'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className={isIncoming ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                      {isIncoming ? '+' : '-'}
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      {isIncoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      {payment.status}
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
