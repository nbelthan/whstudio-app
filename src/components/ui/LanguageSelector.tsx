'use client';

import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslation, SupportedLocale } from '@/hooks/useTranslation';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'expanded';
}

export function LanguageSelector({ className = '', variant = 'compact' }: LanguageSelectorProps) {
  const { t, locale, changeLanguage, availableLanguages, currentLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLocale: SupportedLocale) => {
    changeLanguage(newLocale);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <span className="sm:hidden">{locale.toUpperCase()}</span>
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--color-bg-raised)] border border-[var(--color-divider-low)] rounded-lg shadow-lg min-w-[160px]">
              <div className="py-2">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-[var(--color-bg-surface)] transition-colors ${
                      lang.isActive ? 'text-[var(--color-accent-brand)]' : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {lang.isActive && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Expanded variant for settings page
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Languages className="w-5 h-5 text-[var(--color-text-secondary)]" />
        <div>
          <h3 className="text-[var(--color-text-primary)] font-medium">
            {t('settings.language')}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('settings.language', 'Choose your preferred language')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`p-3 rounded-lg border text-left transition-all ${
              lang.isActive
                ? 'border-[var(--color-accent-brand)] bg-[var(--color-accent-brand)]/10 text-[var(--color-accent-brand)]'
                : 'border-[var(--color-divider-low)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-divider-high)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{lang.name}</div>
                <div className="text-sm opacity-75">{lang.code.toUpperCase()}</div>
              </div>
              {lang.isActive && <Check className="w-5 h-5" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;