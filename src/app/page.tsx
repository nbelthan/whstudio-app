'use client';

// Main entry point for WorldHuman Studio App - Demo Mode
import { useRouter } from 'next/navigation';
import {
  Typography,
  SafeAreaView,
  Button
} from '@worldcoin/mini-apps-ui-kit-react';

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/tasks');
  };

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-8 text-center">
          <Typography
            variant="caption"
            className="text-[var(--color-accent-blue)] uppercase tracking-[0.3em] mb-6 block"
          >
            Demo Access
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
            Earn by completing human intelligence tasks and grow your verified reputation.
          </Typography>
          <Typography
            variant="body2"
            className="text-[color-mix(in srgb,var(--color-text-secondary) 80%,transparent)]"
          >
            Join the future of human–AI collaboration with a World ID verified mini-app.
          </Typography>
        </div>

        <Button
          variant="primary"
          size="large"
          onClick={handleGetStarted}
          className="w-full !rounded-2xl !bg-[var(--color-accent-blue)] !text-black !h-14 !text-base !font-semibold"
        >
          Get Started with Demo
        </Button>

        <Typography
          variant="caption"
          className="text-[color-mix(in srgb,var(--color-text-secondary) 75%,transparent)] text-center"
        >
          Demo mode — no authentication required
        </Typography>
      </div>
    </SafeAreaView>
  );
}
