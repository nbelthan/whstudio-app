'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Earn', href: '/home' },
  { label: 'Borrow', href: '/borrow', disabled: true },
];

export function BottomTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] bg-[color-mix(in srgb,var(--color-bg-base) 95%,black 5%)]',
        className
      )}
    >
      <div
        className="max-w-md mx-auto px-6 py-4 flex items-center justify-between gap-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href === '/home' && pathname === '/');

          if (item.disabled) {
            return (
              <button
                key={item.label}
                disabled
                className="flex-1 flex flex-col items-center gap-2 cursor-not-allowed opacity-60"
              >
                <span className="flex h-11 w-full items-center justify-center rounded-full border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] text-[var(--color-text-secondary)] font-semibold text-sm tracking-[0.2em] uppercase">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <span
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-full font-semibold text-sm tracking-[0.2em] uppercase transition-colors duration-150',
                  isActive
                    ? 'bg-[var(--color-accent-blue)] text-black'
                    : 'border border-[color-mix(in srgb,var(--color-divider-low) 70%,transparent)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabs;
