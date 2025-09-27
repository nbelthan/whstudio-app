'use client';

import {
  Typography,
  SafeAreaView
} from '@worldcoin/mini-apps-ui-kit-react';
import { AuthFlow } from '@/components/auth';

export default function Home() {
  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-8 text-center">
          <Typography
            variant="caption"
            className="text-[var(--color-accent-blue)] uppercase tracking-[0.3em] mb-6 block"
          >
            Sign In
          </Typography>
          <Typography
            variant="h1"
            className="text-[var(--color-text-primary)] text-3xl font-semibold mb-3"
          >
            WorldHuman Studio
          </Typography>
          <Typography
            variant="body1"
            className="text-[color-mix(in srgb,var(--color-text-secondary) 90%,transparent)] mb-4"
          >
            Earn verified rewards through high-quality human intelligence tasks.
          </Typography>
          <Typography
            variant="body2"
            className="text-[color-mix(in srgb,var(--color-text-secondary) 80%,transparent)]"
          >
            Secure sign-in keeps your progress, payouts, and submissions synced.
          </Typography>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-4">
          <AuthFlow />
          <Typography
            variant="caption"
            className="text-[color-mix(in srgb,var(--color-text-secondary) 75%,transparent)] text-center"
          >
            Your World ID credentials stay private and on-device.
          </Typography>
        </div>
      </div>
    </SafeAreaView>
  );
}
