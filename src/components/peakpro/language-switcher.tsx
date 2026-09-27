'use client';

import { useTransition } from 'react';
import { Languages } from 'lucide-react';

import { useLocale } from '@/components/locale-provider';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { cn } from '@/lib/utils';

export function PeakProLanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  const setLocale = (next: Locale) => {
    if (next === locale || pending) return;
    startTransition(async () => {
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) return;
      window.location.reload();
    });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-gold/25 bg-black/70 px-2 py-1',
        pending && 'opacity-60',
        className,
      )}
      role="group"
      aria-label={tPeakpro(locale, 'langAria')}
    >
      <Languages className="h-3.5 w-3.5 text-gold" />
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
          locale === 'zh' ? 'bg-gold text-black' : 'text-zinc-400 hover:text-gold',
        )}
      >
        {tPeakpro(locale, 'langZh')}
      </button>
      <span className="text-gold/40">⇄</span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
          locale === 'en' ? 'bg-gold text-black' : 'text-zinc-400 hover:text-gold',
        )}
      >
        {tPeakpro(locale, 'langEn')}
      </button>
    </div>
  );
}
