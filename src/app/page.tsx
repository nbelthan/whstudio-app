'use client';

// Main entry point for WorldHuman Studio App - Demo Mode
import { useRouter } from 'next/navigation';
import {
  Typography,
  SafeAreaView,
  Button,
  useSafeAreaInsets
} from '@worldcoin/mini-apps-ui-kit-react';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/tasks');
  };

  return (
    <SafeAreaView className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
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

        <Button
          variant="primary"
          size="large"
          onClick={handleGetStarted}
          className="w-full"
        >
          Get Started with Demo
        </Button>

        <Typography variant="caption" className="text-white/40 text-center mt-4 block">
          Demo Mode - No authentication required
        </Typography>
      </div>
    </SafeAreaView>
  );
}