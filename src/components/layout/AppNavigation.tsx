/**
 * App Navigation Component
 * Main navigation for the WorldHuman Studio app
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  FileText,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Shield
} from 'lucide-react';

import { Button, Badge } from '@/components/ui';
import { useAuth, useUI } from '@/stores';
import { cn } from '@/lib/utils';

interface AppNavigationProps {
  className?: string;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: Briefcase,
  },
  {
    name: 'Submissions',
    href: '/submissions',
    icon: FileText,
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCard,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export const AppNavigation: React.FC<AppNavigationProps> = ({
  className,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border border-[rgb(25,137,251)]/30'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        )}
      >
        <Icon className="w-5 h-5" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              leftIcon={sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            >
              Menu
            </Button>
            <h1 className="text-lg font-semibold text-white">WorldHuman Studio</h1>
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 bg-[rgb(25,137,251)]/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[rgb(25,137,251)]" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black/90 border border-white/20 rounded-xl shadow-xl p-2">
                  <div className="px-3 py-2 border-b border-white/10 mb-2">
                    <p className="text-white font-medium">{user.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="primary" size="sm" leftIcon={<Shield className="w-3 h-3" />}>
                        {user.verification_level === 'orb' ? 'Orb Verified' : 'Device Verified'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleLogout}
                    leftIcon={<LogOut className="w-4 h-4" />}
                  >
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-black/95 border-r border-white/10 transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">WorldHuman Studio</h2>
            <p className="text-white/60 text-sm mt-1">Human Intelligence Tasks</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>

          {/* User Info */}
          {user && (
            <div className="px-4 pb-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-10 h-10 bg-[rgb(25,137,251)]/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[rgb(25,137,251)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user.username}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-white/60">
                      {user.verification_level === 'orb' ? 'Orb Verified' : 'Device Verified'}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleLogout}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="mt-3"
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AppNavigation;