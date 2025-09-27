'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Typography,
  SafeAreaView,
  Button,
  ListItem,
  Spinner,
} from '@worldcoin/mini-apps-ui-kit-react';
import { Briefcase, Award, Clock, TrendingUp } from 'lucide-react';

interface User {
  id: string;
  world_id: string;
  username?: string;
  verification_level: string;
  wallet_address?: string;
  reputation_score?: number;
  total_earned?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo mode, always use mock data to avoid auth loops
    const checkAuth = async () => {
      try {
        // Get accumulated earnings from localStorage
        const storedEarnings = parseFloat(localStorage.getItem('demo_total_earned') || '0');
        const submissionCount = parseInt(localStorage.getItem('demo_submission_count') || '0');

        // Always use mock user data for demo
        const mockUser: User = {
          id: '123',
          world_id: 'world_1234567890',
          username: 'Human',
          verification_level: 'device',
          wallet_address: '0x1234567890abcdef',
          reputation_score: 100 + (submissionCount * 10), // Increase reputation with each submission
          total_earned: storedEarnings, // Use accumulated earnings from localStorage
        };
        setUser(mockUser);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // In demo mode, still show dashboard with mock data
        const storedEarnings = parseFloat(localStorage.getItem('demo_total_earned') || '0');
        const submissionCount = parseInt(localStorage.getItem('demo_submission_count') || '0');

        const mockUser: User = {
          id: '123',
          world_id: 'world_1234567890',
          username: 'Human',
          verification_level: 'device',
          wallet_address: '0x1234567890abcdef',
          reputation_score: 100 + (submissionCount * 10),
          total_earned: storedEarnings,
        };
        setUser(mockUser);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Refresh earnings when returning to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        const storedEarnings = parseFloat(localStorage.getItem('demo_total_earned') || '0');
        const submissionCount = parseInt(localStorage.getItem('demo_submission_count') || '0');

        setUser(prev => prev ? {
          ...prev,
          total_earned: storedEarnings,
          reputation_score: 100 + (submissionCount * 10)
        } : null);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-8 h-8 text-white mb-4 mx-auto" />
          <Typography variant="body2" className="text-white/60">
            Loading dashboard...
          </Typography>
        </div>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="w-full max-w-md mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Typography variant="caption" className="text-[var(--color-accent-blue)] tracking-[0.28em] uppercase">
                Overview
              </Typography>
              <Typography variant="h2" className="text-[var(--color-text-primary)] mt-2">
                Welcome back, {user.username || 'Human'}
              </Typography>
            </div>
            <ChipBadge value={user.verification_level} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-raised)] rounded-xl px-4 py-3 border border-[color-mix(in srgb,var(--color-divider-low) 75%,transparent)]">
              <div className="flex items-center gap-2 text-[color-mix(in srgb,var(--color-text-secondary) 85%,transparent)] text-sm">
                <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                Total Earned
              </div>
              <Typography variant="h1" className="text-[var(--color-text-primary)] text-3xl font-semibold mt-2">
                ${user.total_earned || 0}
              </Typography>
            </div>

            <div className="rounded-xl px-4 py-3 border border-[color-mix(in srgb,var(--color-divider-low) 75%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 75%,var(--color-accent-blue) 8%)]">
              <div className="flex items-center gap-2 text-[color-mix(in srgb,var(--color-text-secondary) 85%,transparent)] text-sm">
                <Award className="h-4 w-4 text-[var(--color-accent-blue)]" />
                Reputation
              </div>
              <Typography variant="h1" className="text-[var(--color-text-primary)] text-3xl font-semibold mt-2">
                {user.reputation_score || 0}
              </Typography>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-4">
          <Typography variant="h3" className="text-[var(--color-text-primary)]">
            Quick Actions
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[color-mix(in srgb,var(--color-divider-low) 65%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)]">
              <ListItem
                icon={<Briefcase className="w-5 h-5 text-[var(--color-accent-blue)]" />}
                title="Browse Tasks"
                subtitle="Find new tasks to complete"
                onClick={() => router.push('/tasks')}
              />
            </div>
            <div className="rounded-xl border border-[color-mix(in srgb,var(--color-divider-low) 65%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 85%,transparent)]">
              <ListItem
                icon={<Clock className="w-5 h-5 text-[var(--color-warning)]" />}
                title="My Submissions"
                subtitle="Track pending submissions"
                onClick={() => router.push('/submissions')}
              />
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-4">
          <Typography variant="h3" className="text-[var(--color-text-primary)]">
            Account Info
          </Typography>
          <div className="grid grid-cols-1 gap-3">
            <InfoRow label="World ID" value={user.world_id} />
            <InfoRow label="Verification" value={user.verification_level} isCapitalized />
            {user.wallet_address && (
              <InfoRow
                label="Wallet"
                value={`${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
              />
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="large"
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className="w-full !rounded-2xl !border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] !bg-[color-mix(in srgb,var(--color-bg-surface) 90%,transparent)] !text-[var(--color-text-primary)]"
        >
          Sign Out
        </Button>
      </div>
    </SafeAreaView>
  );
}

function ChipBadge({ value }: { value?: string }) {
  const label = value ? value.replace(/_/g, ' ') : 'verified';
  const formattedLabel = label
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
  const formatted = value ? `${formattedLabel} Verified` : formattedLabel;
  return (
    <span className="inline-flex h-8 items-center rounded-full border border-[color-mix(in srgb,var(--color-accent-blue) 35%,transparent)] bg-[color-mix(in srgb,var(--color-accent-blue) 18%,transparent)] px-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-accent-blue)]">
      {formatted}
    </span>
  );
}

function InfoRow({
  label,
  value,
  isCapitalized,
}: {
  label: string;
  value: string | number | undefined;
  isCapitalized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Typography variant="caption" className="text-[var(--color-text-secondary)]">
        {label}
      </Typography>
      <Typography
        variant="body2"
        className={`text-[var(--color-text-primary)] ${isCapitalized ? 'capitalize' : ''}`}
      >
        {value}
      </Typography>
    </div>
  );
}
