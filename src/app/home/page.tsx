'use client';

import { SafeAreaView } from '@worldcoin/mini-apps-ui-kit-react';
import { ShieldCheck, Sparkles, Info, ArrowRight, Wallet, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const heroMetric = {
  title: 'My Deposits',
  total: 65.47,
  apy: 39.89,
};

const assets = [
  {
    symbol: 'WLD',
    name: 'Worldcoin',
    apy: 39.89,
    deposit: 48.92,
    boosted: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    apy: 12.45,
    deposit: 16.55,
    boosted: false,
  },
  {
    symbol: 'sETH',
    name: 'Staked ETH',
    apy: 4.32,
    deposit: 0,
    boosted: false,
  },
];

const bannerCopy =
  'World ID verified. One human, one wallet. Boosted APY applies while your verification is active.';

function TokenAvatar({ symbol }: { symbol: string }) {
  const baseStyles = cn(
    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold tracking-wide',
    'border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)]'
  );

  if (symbol === 'WLD') {
    return (
      <span className={cn(baseStyles, 'bg-[var(--color-token-wld-light)] text-black')}>
        {symbol}
      </span>
    );
  }

  if (symbol === 'USDC') {
    return (
      <span
        className={cn(
          baseStyles,
          'bg-[color-mix(in srgb,var(--color-token-usdc) 15%,transparent)] text-[var(--color-token-usdc)]'
        )}
      >
        {symbol}
      </span>
    );
  }

  return (
    <span
      className={cn(
        baseStyles,
        'bg-[color-mix(in srgb,var(--color-accent-teal) 15%,transparent)] text-[var(--color-text-primary)]'
      )}
    >
      {symbol}
    </span>
  );
}

function SectionTitle({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-secondary)] mb-2">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] pb-32">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <Card variant="default" padding="lg" className="flex items-start gap-4">
          <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-accent-blue)]" />
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {bannerCopy}
          </p>
        </Card>

        <section className="space-y-5">
          <SectionTitle title="My Deposits" eyebrow="Portfolio" />

          <Card variant="elevated" padding="lg" className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
                Balance
              </p>
              <h1 className="text-4xl font-semibold text-[var(--color-text-primary)]">
                {currencyFormatter.format(heroMetric.total)}
              </h1>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <span>{heroMetric.apy.toFixed(2)}% net supply APY</span>
                <Info className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[var(--color-bg-raised)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  World ID Boost
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Verified humans earn bonus WLD rewards
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in srgb,var(--color-brand-verify) 18%,transparent)] text-[var(--color-brand-verify)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>
          </Card>
        </section>

        <section className="space-y-5">
          <SectionTitle
            title="Explore earning"
            action={
              <Badge variant="default" size="md">
                Rewards live
                <Sparkles className="h-3 w-3" />
              </Badge>
            }
          />

          <Card variant="default" className="divide-y divide-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)]">
            {assets.map((asset) => (
              <div key={asset.symbol} className="flex items-center gap-4 px-4 py-4 first:pt-5 last:pb-5">
                <TokenAvatar symbol={asset.symbol} />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {asset.symbol}
                    </p>
                    {asset.boosted ? (
                      <Badge
                        variant="primary"
                        size="sm"
                        leftIcon={<Sparkles className="h-3 w-3" />}
                      >
                        {asset.apy.toFixed(2)}% APY
                      </Badge>
                    ) : (
                      <Badge variant="ghost" size="sm">
                        {asset.apy.toFixed(2)}% APY
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{asset.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] mb-1">
                    My Deposit
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {asset.deposit > 0 ? currencyFormatter.format(asset.deposit) : '–'}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section className="space-y-4">
          <SectionTitle title="Need liquidity?" action={null} />
          <Card variant="default" padding="lg" className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Borrow against deposits</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Unlock instant liquidity with self-repaying loans
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </Card>
        </section>

        <div className="h-16" />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-base) 95%,black 5%)]"
      >
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-around gap-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            type="button"
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span className="flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-accent-blue)] text-black font-semibold text-sm tracking-[0.2em] uppercase">
              Earn
            </span>
          </button>
          <button
            type="button"
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--color-divider-low)] text-[var(--color-text-secondary)] font-semibold text-sm tracking-[0.2em] uppercase">
              Borrow
            </span>
          </button>
        </div>
      </nav>
    </SafeAreaView>
  );
}
