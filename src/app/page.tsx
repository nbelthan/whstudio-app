'use client';

import { AuthFlow } from '@/components/auth';

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            WorldHuman Studio
          </h1>
          <p className="text-white/80 text-lg mb-2">
            Earn by completing human intelligence tasks
          </p>
          <p className="text-white/60 text-sm">
            Join the future of human-AI collaboration
          </p>
        </div>

        <AuthFlow />
      </div>
    </div>
  );
}
