import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { localizedNewsText, newsCategoryLabel, newsSourceLabel, tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import type { NewsCacheRow } from '@/lib/peakpro/types';

export function PeakProNewsDetail({
  locale,
  item,
}: {
  locale: Locale;
  item: NewsCacheRow | null;
}) {
  if (!item) {
    return (
      <div className="space-y-6">
        <Link href="/app/geopolitics" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'backToDesk')}
        </Link>
        <div className="rounded-2xl border border-gold/15 px-6 py-16 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'missingNews')}
        </div>
      </div>
    );
  }

  const published = item.published_at
    ? new Date(item.published_at).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="space-y-8">
      <Link href="/app/geopolitics" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
        <ArrowLeft className="h-4 w-4" />
        {tPeakpro(locale, 'backToDesk')}
      </Link>

      <article className="rounded-3xl border border-gold/15 bg-black/60 p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">
          {newsCategoryLabel(locale, item.category)} · {newsSourceLabel(locale, item.source)}
        </p>
        {published ? <p className="mt-2 text-xs text-zinc-500">{published}</p> : null}
        <h1 className="mt-4 font-peakpro text-3xl leading-snug text-gold md:text-4xl">
          {localizedNewsText(locale, item.title, item.title_zh)}
        </h1>
        <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
          {localizedNewsText(locale, item.summary, item.summary_zh)}
        </p>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm text-gold hover:underline"
          >
            {tPeakpro(locale, 'readOriginal')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <p className="mt-8 text-[11px] leading-relaxed text-zinc-600">
          {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
        </p>
      </article>
    </div>
  );
}
