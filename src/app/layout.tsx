import type { Metadata } from 'next';
import { Chakra_Petch, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { PeakProAtmosphere } from '@/components/peakpro/atmosphere';
import { LocaleProvider } from '@/components/locale-provider';
import { localeHtmlLang } from '@/i18n/locale';
import { getLocale, getMessages } from '@/i18n/server';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';

import './globals.css';

const display = Chakra_Petch({
  subsets: ['latin'],
  variable: '--font-peakpro-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-peakpro-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-peakpro-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const desk = await getDeskRegion();
  const us = desk === 'us';
  return {
    title: locale === 'zh' ? 'PeakPro+ 市場情報' : 'PeakPro+ Market Intelligence',
    description: us
      ? locale === 'zh'
        ? '機構級市場情報終端：美股、加密、黃金、地緣風險與 AI 每週總結。'
        : 'Institutional market intelligence: U.S. equities, crypto, gold, geopolitical risk, and an AI weekly summary.'
      : locale === 'zh'
        ? '機構級市場情報終端：台美股、加密、黃金、地緣風險與 AI 每週總結。'
        : 'Institutional market intelligence: equities, crypto, gold, geopolitical risk, and an AI weekly summary.',
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html lang={localeHtmlLang(locale)} style={{ colorScheme: 'dark' }}>
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} min-h-screen bg-void text-ice antialiased`}
      >
        <PeakProAtmosphere />
        <LocaleProvider locale={locale} messages={messages}>
          <div className="relative z-10">{children}</div>
        </LocaleProvider>
      </body>
    </html>
  );
}
