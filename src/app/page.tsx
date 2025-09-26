'use client';

// Main entry point for WorldHuman Studio App
// Deployment test: 2025-09-26 16:15
import {
  Typography,
  SafeAreaView,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import { AuthFlow } from '@/components/auth';

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-4">
          <Typography variant="h1" className="text-white mb-2">
            WorldHuman Studio
          </Typography>
          <Typography variant="body1" className="text-white/80 mb-1">
            Earn by completing human intelligence tasks
          </Typography>
          <Typography variant="body2" className="text-white/60">
            Join the future of human-AI collaboration
          </Typography>
        </div>

        <AuthFlow />
      </div>
    </SafeAreaView>
  );
}
