/**
 * App Header Component - Stats Bar
 * Shows user stats at the top, navigation moved to bottom tabs
 */

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Typography,
  Chip
} from '@worldcoin/mini-apps-ui-kit-react';
import {
  DollarSign,
  Award
} from 'lucide-react';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export default function AppHeader() {
  const pathname = usePathname();
  const [earnings, setEarnings] = useState<number>(0);
  const [reputation, setReputation] = useState<number>(100);

  // Update stats from localStorage
  useEffect(() => {
    const updateStats = () => {
      const storedEarnings = parseFloat(localStorage.getItem('demo_total_earned') || '0');
      const submissionCount = parseInt(localStorage.getItem('demo_submission_count') || '0');
      setEarnings(storedEarnings);
      setReputation(100 + (submissionCount * 10));
    };

    updateStats();

    // Update when window regains focus
    window.addEventListener('focus', updateStats);

    // Update on storage change (for cross-tab sync)
    window.addEventListener('storage', updateStats);

    return () => {
      window.removeEventListener('focus', updateStats);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  // Don't show header on landing page
  if (pathname === '/') return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-base)] border-b border-[var(--color-divider-low)]">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: App Name */}
          <Typography variant="h4" className="text-[var(--color-text-primary)]">
            WorldHuman Studio
          </Typography>

          {/* Right: User Stats and Language Selector */}
          <div className="flex items-center gap-3">
            <Chip
              variant="success"
              size="small"
              className="flex items-center gap-1"
            >
              <DollarSign className="w-3 h-3" />
              ${earnings.toFixed(2)}
            </Chip>
            <Chip
              variant="secondary"
              size="small"
              className="flex items-center gap-1"
            >
              <Award className="w-3 h-3" />
              {reputation}
            </Chip>
            <LanguageSelector variant="compact" className="ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
