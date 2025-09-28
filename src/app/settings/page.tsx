'use client';

import React from 'react';
import {
  Typography,
  SafeAreaView,
  Button,
} from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, User, Bell, Shield, HelpCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const settingSections = [
    {
      title: t('settings.account'),
      icon: User,
      items: [
        { label: t('auth.verifyWithWorldId'), action: () => {} },
        { label: t('auth.connectWallet'), action: () => {} },
      ],
    },
    {
      title: t('settings.notifications'),
      icon: Bell,
      items: [
        { label: 'Task Updates', action: () => {} },
        { label: 'Payment Notifications', action: () => {} },
      ],
    },
    {
      title: t('settings.privacy'),
      icon: Shield,
      items: [
        { label: 'Data Privacy', action: () => {} },
        { label: 'Verification Settings', action: () => {} },
      ],
    },
    {
      title: t('settings.support'),
      icon: HelpCircle,
      items: [
        { label: 'Contact Support', action: () => {} },
        { label: 'FAQ', action: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--color-divider-low)]">
          <Button
            variant="secondary"
            size="small"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Typography variant="h3" className="text-[var(--color-text-primary)]">
            {t('settings.title')}
          </Typography>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Language Selector */}
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6">
            <LanguageSelector variant="expanded" />
          </div>

          {/* Settings Sections */}
          {settingSections.map((section) => (
            <div
              key={section.title}
              className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <Typography variant="h4" className="text-[var(--color-text-primary)]">
                  {section.title}
                </Typography>
              </div>

              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full text-left p-3 rounded-lg hover:bg-[var(--color-bg-raised)] transition-colors"
                  >
                    <Typography variant="body1" className="text-[var(--color-text-primary)]">
                      {item.label}
                    </Typography>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-divider-low)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <Typography variant="h4" className="text-[var(--color-text-primary)]">
                {t('settings.about')}
              </Typography>
            </div>

            <div className="space-y-3 text-center">
              <Typography variant="h3" className="text-[var(--color-text-primary)]">
                WorldHuman Studio
              </Typography>
              <Typography variant="body2" className="text-[var(--color-text-secondary)]">
                Version 1.0.0
              </Typography>
              <Typography variant="body2" className="text-[var(--color-text-secondary)]">
                Earn by completing human intelligence tasks with World ID verification
              </Typography>
            </div>
          </div>

          {/* Sign Out */}
          <Button
            variant="secondary"
            size="large"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/');
              } catch (error) {
                console.error('Logout failed:', error);
              }
            }}
            className="w-full !rounded-2xl !border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] !bg-[color-mix(in srgb,var(--color-bg-surface) 90%,transparent)] !text-[var(--color-text-primary)]"
          >
            {t('auth.signOut')}
          </Button>
        </div>
      </div>
    </SafeAreaView>
  );
}