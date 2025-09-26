'use client';

import {
  Typography,
  Button,
  SafeAreaView,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';
import { AuthFlow } from '@/components/auth';

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Typography variant="h1" className="text-white mb-4">
            WorldHuman Studio
          </Typography>
          <Typography variant="body1" className="text-white/80 mb-2">
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