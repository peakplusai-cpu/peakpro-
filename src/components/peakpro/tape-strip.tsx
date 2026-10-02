'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { formatPct, formatZhang } from '@/lib/peakpro/format';
import type { TapeRow } from '@/lib/peakpro/tape';
import { cn } from '@/lib/utils';

export function PeakProTapeStrip({
  locale,
  symbol,
}: {
  locale: Locale;
  symbol: string;
}) {
  const [row, setRow] = useState<TapeRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/tape?symbol=${encodeURIComponent(symbol)}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) return;
      const json = (await response.json().catch(() => null)) as { desk?: { rows?: TapeRow[] } } | null;
      const next = json?.desk?.rows?.[0] ?? null;
      if (!cancelled) setRow(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!row || (row.prints === 0 && !row.inst)) return null;

  return (
    <section className="rounded-3xl border border-gold/15 bg-black/60 p-6">
      <p className="text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, 'tapeTitle')}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{tPeakpro(locale, 'tapeTurn')}</p>
          <p className="mt-1 text-sm text-zinc-100">{tPeakpro(locale, `tape_${row.turn}`)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{tPeakpro(locale, 'tapeRs')}</p>
          <p className="mt-1 text-sm text-zinc-100">
            {tPeakpro(locale, `tape_${row.rs}`)}
            {row.rsPct != null ? ` ${formatPct(row.rsPct)}` : ''}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{tPeakpro(locale, 'tapeVol')}</p>
          <p className="mt-1 text-sm text-zinc-100">
            {row.volumeRatio != null ? `${row.volumeRatio.toFixed(2)}×` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{tPeakpro(locale, 'tapeInst')}</p>
          <p
            className={cn(
              'mt-1 text-sm',
              row.inst ? (row.inst.totalNet >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-zinc-500',
            )}
          >
            {row.market === 'us'
              ? tPeakpro(locale, 'tapeNoInst')
              : row.inst
                ? formatZhang(row.inst.totalNet)
                : tPeakpro(locale, 'tapePendingInst')}
          </p>
        </div>
      </div>
    </section>
  );
}
