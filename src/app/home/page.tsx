'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to tasks page for demo
    router.push('/tasks');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center">
      <div className="text-[color-mix(in srgb,var(--color-text-secondary) 85%,transparent)]">
        Redirecting to tasks...
      </div>
    </div>
  );
}
