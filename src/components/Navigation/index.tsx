'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, Briefcase, FileText, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

export const Navigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState('dashboard');
  const { t } = useTranslation();

  // Update tab value based on current pathname
  useEffect(() => {
    if (pathname === '/dashboard' || pathname === '/') {
      setValue('dashboard');
    } else if (pathname.includes('/tasks')) {
      setValue('tasks');
    } else if (pathname.includes('/submissions')) {
      setValue('submissions');
    } else if (pathname.includes('/payments')) {
      setValue('payments');
    } else if (pathname.includes('/settings')) {
      setValue('settings');
    }
  }, [pathname]);

  const handleTabChange = (newValue: string) => {
    setValue(newValue);
    switch (newValue) {
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'tasks':
        router.push('/tasks');
        break;
      case 'submissions':
        router.push('/submissions');
        break;
      case 'payments':
        router.push('/payments');
        break;
      case 'settings':
        router.push('/settings');
        break;
    }
  };

  // Don't show navigation on landing page
  if (pathname === '/') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-base)] border-t border-[var(--color-divider-low)]">
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Tabs value={value} onValueChange={handleTabChange}>
          <TabItem value="dashboard" icon={<Home />} label={t('navigation.dashboard')} />
          <TabItem value="tasks" icon={<Briefcase />} label={t('navigation.tasks')} />
          <TabItem value="submissions" icon={<FileText />} label={t('navigation.submissions')} />
          <TabItem value="settings" icon={<Settings />} label={t('settings.title')} />
        </Tabs>
      </div>
    </div>
  );
};
