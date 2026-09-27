'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Locale } from '@/i18n/locale';
import { createTranslator, type MessageTree, type Translator } from '@/i18n/translator';

const LocaleContext = createContext<{ locale: Locale; t: Translator } | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: MessageTree;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx.locale;
}

export function useTranslations(): Translator {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useTranslations must be used within LocaleProvider');
  return ctx.t;
}
