'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, FileText, CreditCard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores';

interface BottomTabsProps {
  className?: string;
}

const navigationItems = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: Briefcase },
  { name: 'Submit', href: '/submissions', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const BottomTabs = ({ className }: BottomTabsProps) => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/10 backdrop-blur-xl',
        className,
      )}
    >
      <div
        className="px-6 pt-4"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 12px)` }}
      >
        <div className="flex items-center justify-between gap-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[rgb(25,137,251)]'
                    : 'text-white/60 hover:text-white',
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6 transition-transform',
                    isActive && 'scale-[1.05]'
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {user?.username && (
          <p className="mt-4 text-center text-xs text-white/50">
            Signed in as <span className="text-white font-medium">{user.username}</span>
          </p>
        )}
      </div>
    </nav>
  );
};

export default BottomTabs;
