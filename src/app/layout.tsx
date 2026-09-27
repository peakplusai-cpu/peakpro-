import type { Metadata } from 'next';
import { Cinzel } from 'next/font/google';
import type { ReactNode } from 'react';

import { LocaleProvider } from '@/components/locale-provider';
import { localeHtmlLang } from '@/i18n/locale';
import { getLocale, getMessages } from '@/i18n/server';

import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-peakpro-serif',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === 'zh' ? 'PeakPro+ 市場情報' : 'PeakPro+ Market Intelligence',
    description:
      locale === 'zh'
        ? '機構級市場情報終端：台美股、加密、黃金、地緣風險與 AI 每週總結。'
        : 'Institutional market intelligence: equities, crypto, gold, geopolitical risk, and an AI weekly summary.',
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html lang={localeHtmlLang(locale)} style={{ colorScheme: 'dark' }}>
      <body className={`${cinzel.variable} min-h-screen bg-black text-zinc-50 antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
