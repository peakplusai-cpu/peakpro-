import { SparkCandles } from '@/components/peakpro/charts';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { projectBars } from '@/lib/peakpro/forecast';
import { displayPx, formatPct } from '@/lib/peakpro/format';
import type { MarketTimeframe, OhlcBar } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function PeakProProjectedCandles({
  locale,
  bars,
  timeframe,
  currency,
  usdTwd,
  className,
}: {
  locale: Locale;
  bars: OhlcBar[];
  timeframe: MarketTimeframe;
  currency: string;
  usdTwd?: number | null;
  className?: string;
}) {
  const projection = projectBars(bars, timeframe);
  const px = (value: number) => displayPx(value, currency, locale, usdTwd);

  if (!projection) {
    return (
      <SparkCandles bars={bars} width={960} height={360} className={cn('h-64 w-full md:h-80', className)} />
    );
  }

  const end = projection.bars[projection.bars.length - 1];
  const unit = tPeakpro(locale, `projUnit_${timeframe}`);
  const arrow = projection.direction === 'up' ? '▲' : projection.direction === 'down' ? '▼' : '◆';
  const tone =
    projection.direction === 'up' ? 'text-signal' : projection.direction === 'down' ? 'text-plasma' : 'text-warn';
  const dirLabel = tPeakpro(locale, `projDir_${projection.direction}`);

  return (
    <div>
      <SparkCandles
        bars={bars}
        projection={projection.bars}
        projectionLabel={tPeakpro(locale, 'projLabel')}
        width={960}
        height={360}
        className={cn('h-64 w-full md:h-80', className)}
      />
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-signal/10 pt-4">
        <p className={cn('font-mono text-xs uppercase tracking-[0.18em]', tone)}>
          {arrow} {dirLabel} · {formatPct(projection.movePct)}
        </p>
        <p className="font-mono text-xs text-zinc-400">
          {tPeakpro(locale, 'projHorizon')} {projection.bars.length} {unit}
          <span className="mx-2 text-zinc-700">/</span>
          {tPeakpro(locale, 'projMedian')} {px(end.c)}
          <span className="mx-2 text-zinc-700">/</span>
          1σ {px(end.lo)} – {px(end.hi)}
        </p>
      </div>
    </div>
  );
}
