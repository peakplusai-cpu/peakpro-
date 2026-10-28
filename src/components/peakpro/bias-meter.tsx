import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { biasBand, biasRankFromBars, type ForecastContext } from '@/lib/peakpro/forecast';
import type { MarketDataRow, OhlcBar } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

function bandLabel(locale: Locale, rank: number) {
  const band = biasBand(rank);
  if (band === 'bull') return tPeakpro(locale, 'biasBull');
  if (band === 'bear') return tPeakpro(locale, 'biasBear');
  return tPeakpro(locale, 'biasMid');
}

function bandTone(rank: number) {
  const band = biasBand(rank);
  if (band === 'bull') return 'text-signal';
  if (band === 'bear') return 'text-plasma';
  return 'text-warn';
}

function cellLit(n: number, rank: number) {
  if (rank === 5) return n === 5;
  if (rank > 5) return n >= 5 && n <= rank;
  return n <= 5 && n >= rank;
}

function cellClass(n: number, rank: number) {
  const lit = cellLit(n, rank);
  const active = n === rank;
  if (active && rank >= 6) return 'bg-signal shadow-[0_0_10px_rgba(94,234,212,0.45)]';
  if (active && rank <= 4) return 'bg-plasma shadow-[0_0_10px_rgba(167,139,250,0.4)]';
  if (active) return 'bg-warn shadow-[0_0_10px_rgba(251,191,36,0.35)]';
  if (lit && rank >= 6) return 'bg-signal/45';
  if (lit && rank <= 4) return 'bg-plasma/45';
  if (n === 5) return 'bg-zinc-600';
  return 'bg-zinc-800';
}

export function PeakProBiasMeter({
  locale,
  rank,
  size = 'md',
  title,
}: {
  locale: Locale;
  rank: number | null;
  size?: 'sm' | 'md';
  title?: string;
}) {
  if (rank == null) return null;
  const compact = size === 'sm';

  return (
    <div className={cn('min-w-0', compact ? 'w-full' : 'w-full')}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn(compact ? 'font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500' : 'peakpro-kicker')}>
          {title ?? tPeakpro(locale, 'biasTitle')}
        </p>
        <p className={cn('font-mono tabular-nums', compact ? 'text-[10px]' : 'text-xs', bandTone(rank))}>
          {rank}
          <span className="mx-1.5 text-zinc-700">·</span>
          {bandLabel(locale, rank)}
        </p>
      </div>
      <div className={cn('flex', compact ? 'mt-1.5 gap-0.5' : 'mt-2.5 gap-1')} aria-hidden>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
          <span
            key={n}
            className={cn('min-w-0 flex-1 rounded-[1px]', compact ? 'h-1.5' : 'h-2.5', cellClass(n, rank))}
          />
        ))}
      </div>
      {compact ? null : (
        <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
          <span>1 {tPeakpro(locale, 'biasBear')}</span>
          <span>5 {tPeakpro(locale, 'biasMid')}</span>
          <span>10 {tPeakpro(locale, 'biasBull')}</span>
        </div>
      )}
    </div>
  );
}

export function PeakProRowBiasMeter({
  locale,
  row,
  size = 'sm',
}: {
  locale: Locale;
  row: MarketDataRow;
  size?: 'sm' | 'md';
}) {
  return (
    <PeakProBarsBiasMeter
      locale={locale}
      bars={row.payload.bars}
      context={{ changePct: row.payload.changePct }}
      size={size}
    />
  );
}

export function PeakProBarsBiasMeter({
  locale,
  bars,
  context,
  size = 'md',
}: {
  locale: Locale;
  bars: OhlcBar[];
  context?: ForecastContext;
  size?: 'sm' | 'md';
}) {
  const rank = biasRankFromBars(bars, context);
  return <PeakProBiasMeter locale={locale} rank={rank} size={size} />;
}
