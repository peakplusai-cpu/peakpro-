import type { Locale } from '@/i18n/locale';
import { canAccessEquity, canAccessModule } from '@/lib/peakpro/access';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';
import type {
  FearGreedPayload,
  MarketDataRow,
  PeakProCacheSnapshot,
  PeakProTier,
  TrendingPayload,
} from '@/lib/peakpro/types';
import { FearGreedGauge, SparkCandles } from '@/components/peakpro/charts';
import { PeakProPaywall } from '@/components/peakpro/paywall';

function formatPx(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'TWD' ? 'TWD' : 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function SeriesCard({
  locale,
  row,
}: {
  locale: Locale;
  row: MarketDataRow;
}) {
  const payload = row.payload;
  const up = payload.changePct >= 0;
  return (
    <article className="rounded-2xl border border-gold/15 bg-black/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{row.symbol}</p>
          <h3 className="mt-1 font-peakpro text-xl text-white">{payload.name}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">{row.timeframe}</p>
        </div>
        <div className="text-right">
          <p className="font-peakpro text-2xl text-gold">{formatPx(payload.last, payload.currency)}</p>
          <p className={up ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
            {up ? '+' : ''}
            {payload.changePct.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="mt-4">
        <SparkCandles bars={payload.bars} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
        {locale === 'zh' ? payload.thesisZh : payload.thesis}
      </p>
    </article>
  );
}

function EmptyCache({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-gold/15 px-6 py-16 text-center text-sm text-zinc-500">
      {tPeakpro(locale, 'emptyCache')}
    </div>
  );
}

export function PeakProModuleView({
  locale,
  tier,
  moduleId,
  cache,
}: {
  locale: Locale;
  tier: PeakProTier;
  moduleId: PeakProModule;
  cache: PeakProCacheSnapshot;
}) {
  const locked = !canAccessModule(tier, moduleId) && moduleId !== 'overview' && moduleId !== 'equities';

  if (locked) {
    return (
      <PeakProPaywall locale={locale}>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {cache.equities.slice(0, 4).map((row) => (
            <SeriesCard key={row.id} locale={locale} row={row} />
          ))}
        </div>
      </PeakProPaywall>
    );
  }

  if (moduleId === 'overview') {
    const freeMonthly = cache.equities.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe));
    return (
      <div className="space-y-8">
        <p className="text-sm text-zinc-400">{tPeakpro(locale, 'overviewLead')}</p>
        <section>
          <h2 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">
            {tPeakpro(locale, 'monthlyOnly')}
          </h2>
          {freeMonthly.length === 0 ? (
            <EmptyCache locale={locale} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {freeMonthly.map((row) => (
                <SeriesCard key={row.id} locale={locale} row={row} />
              ))}
            </div>
          )}
        </section>
        {tier === 'free' ? (
          <PeakProPaywall locale={locale} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cache.crypto.slice(0, 2).map((row) => (
              <SeriesCard key={row.id} locale={locale} row={row} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'equities') {
    const daily = cache.equities.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe) && row.timeframe === 'daily');
    const monthly = cache.equities.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe) && row.timeframe === 'monthly');
    const annual = cache.equities.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe) && row.timeframe === 'annual');
    return (
      <div className="space-y-10">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'equitiesTitle')}</h2>
        {tier === 'premium' ? (
          <TimeframeBlock locale={locale} titleKey="dailyTrends" rows={daily} />
        ) : (
          <PeakProPaywall locale={locale} />
        )}
        <TimeframeBlock locale={locale} titleKey="monthlyTrends" rows={monthly} />
        {tier === 'premium' ? (
          <TimeframeBlock locale={locale} titleKey="annualOutlook" rows={annual} />
        ) : (
          <PeakProPaywall locale={locale} />
        )}
      </div>
    );
  }

  if (moduleId === 'crypto') {
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'cryptoTitle')}</h2>
        {cache.crypto.length === 0 ? <EmptyCache locale={locale} /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {cache.crypto.map((row) => (
              <SeriesCard key={row.id} locale={locale} row={row} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'gold') {
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'goldTitle')}</h2>
        {cache.gold.length === 0 ? <EmptyCache locale={locale} /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {cache.gold.map((row) => (
              <SeriesCard key={row.id} locale={locale} row={row} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'geopolitics') {
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'newsTitle')}</h2>
        {cache.news.length === 0 ? <EmptyCache locale={locale} /> : (
          <div className="space-y-4">
            {cache.news.map((item) => (
              <article key={item.id} className="rounded-2xl border border-gold/15 bg-black/60 p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">
                  {item.category} · {item.source}
                </p>
                <h3 className="mt-2 font-peakpro text-xl text-white">
                  {locale === 'zh' && item.title_zh ? item.title_zh : item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {locale === 'zh' && item.summary_zh ? item.summary_zh : item.summary}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'sentiment') {
    const payload = cache.fearGreed?.payload as unknown as FearGreedPayload | undefined;
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'fearTitle')}</h2>
        {!payload ? (
          <EmptyCache locale={locale} />
        ) : (
          <div className="rounded-3xl border border-gold/15 bg-black/60 p-8">
            <FearGreedGauge data={payload} />
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-zinc-400">
              {locale === 'zh' ? payload.commentaryZh : payload.commentary}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'trending') {
    const payload = cache.trending?.payload as unknown as TrendingPayload | undefined;
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'trendingTitle')}</h2>
        {!payload?.items?.length ? (
          <EmptyCache locale={locale} />
        ) : (
          <ol className="space-y-3">
            {payload.items.map((item) => (
              <li
                key={item.symbol + item.rank}
                className="flex items-start justify-between gap-4 rounded-2xl border border-gold/15 bg-black/60 px-5 py-4"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gold">#{item.rank}</p>
                  <p className="mt-1 font-peakpro text-xl text-white">
                    {item.symbol} <span className="text-zinc-500">{item.name}</span>
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    {locale === 'zh' ? item.catalystZh : item.catalyst}
                  </p>
                </div>
                <p className={item.changePct >= 0 ? 'font-peakpro text-2xl text-emerald-400' : 'font-peakpro text-2xl text-red-400'}>
                  {item.changePct >= 0 ? '+' : ''}
                  {item.changePct.toFixed(2)}%
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const brief = cache.briefs.find((row) => row.locale === locale) ?? cache.briefs[0];
  return (
    <div className="space-y-6">
      <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'briefTitle')}</h2>
      {!brief ? (
        <EmptyCache locale={locale} />
      ) : (
        <article className="rounded-3xl border border-gold/15 bg-black/60 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-antique">
            {brief.period_start} → {brief.period_end}
          </p>
          <h3 className="mt-3 font-peakpro text-2xl text-white">{brief.title}</h3>
          <div className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap text-sm leading-7 text-zinc-300">
            {brief.content}
          </div>
        </article>
      )}
    </div>
  );
}

function TimeframeBlock({
  locale,
  titleKey,
  rows,
}: {
  locale: Locale;
  titleKey: string;
  rows: MarketDataRow[];
}) {
  return (
    <section>
      <h3 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, titleKey)}</h3>
      {rows.length === 0 ? (
        <EmptyCache locale={locale} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <SeriesCard key={row.id} locale={locale} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}
