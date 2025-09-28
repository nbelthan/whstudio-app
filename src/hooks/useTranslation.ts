'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';

// Import all translation files
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import th from '@/locales/th.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import pt from '@/locales/pt.json';

// Type definitions for our translation structure
type TranslationKeys = typeof en;

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

// Language configurations
const translations = {
  en,
  es,
  th,
  ja,
  ko,
  pt,
} as const;

export type SupportedLocale = keyof typeof translations;

const languageNames: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  th: 'ไทย',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
};

const STORAGE_KEY = 'whstudio-locale';

/**
 * Custom hook for internationalization
 * Uses localStorage for persistence since we're in App Router
 */
export function useTranslation() {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale from localStorage or browser preference
  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem(STORAGE_KEY) as SupportedLocale;
      const browserLocale = navigator.language?.slice(0, 2) as SupportedLocale;

      if (storedLocale && Object.keys(translations).includes(storedLocale)) {
        setLocale(storedLocale);
      } else if (browserLocale && Object.keys(translations).includes(browserLocale)) {
        setLocale(browserLocale);
      } else {
        setLocale('en');
      }
    } catch (error) {
      console.warn('Failed to load locale preferences:', error);
      setLocale('en');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get the current translation object
  const currentTranslations = useMemo(() => {
    return translations[locale] || translations.en;
  }, [locale]);

  // Translation function with nested key support
  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      try {
        // Split the key by dots to access nested properties
        const keys = key.split('.');
        let value: any = currentTranslations;

        for (const k of keys) {
          value = value?.[k];
        }

        if (typeof value === 'string') {
          return value;
        }

        // If no translation found, return fallback or key
        return fallback || key;
      } catch (error) {
        console.warn(`Translation key "${key}" not found for locale "${locale}"`);
        return fallback || key;
      }
    },
    [currentTranslations, locale]
  );

  // Function to change language
  const changeLanguage = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);

    // Update document language attribute
    document.documentElement.lang = newLocale;
  }, []);

  // Get available languages
  const availableLanguages = useMemo(() => {
    return Object.entries(languageNames).map(([code, name]) => ({
      code: code as SupportedLocale,
      name,
      isActive: code === locale,
    }));
  }, [locale]);

  // Get current language info
  const currentLanguage = useMemo(() => {
    return {
      code: locale,
      name: languageNames[locale],
    };
  }, [locale]);

  return {
    t,
    locale,
    changeLanguage,
    availableLanguages,
    currentLanguage,
    isLoading,
    isRTL: false, // None of our supported languages are RTL
  };
}

// Helper function for components that need direct translation access
export function getStaticTranslation(locale: SupportedLocale, key: TranslationKey): string {
  const currentTranslations = translations[locale] || translations.en;

  try {
    const keys = key.split('.');
    let value: any = currentTranslations;

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value === 'string') {
      return value;
    }

    return key;
  } catch (error) {
    return key;
  }
}

// Export types for use in components
export type { TranslationKey, SupportedLocale };