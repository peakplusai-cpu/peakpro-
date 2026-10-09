import type { Locale } from '@/i18n/locale';
import { canAccessEquity, canAccessModule } from '@/lib/peakpro/access';
import { EQUITY_UNIVERSE, type PeakProModule } from '@/lib/peakpro/constants';
import { localizedNewsText, newsCategoryLabel, newsSourceLabel, tPeakpro } from '@/lib/peakpro/copy';
import { displayPx, formatPct, publicThesis } from '@/lib/peakpro/format';
import { deskBiasGauges } from '@/lib/peakpro/sentiment';
import type {
  FearGreedPayload,
  FilingsPayload,
  MarketDataRow,
  PeakProCacheSnapshot,
  PeakProTier,
  SentimentGauge,
  TrendingItem,
  TrendingPayload,
} from '@/lib/peakpro/types';
import { FearGreedGauge, SparkCandles } from '@/components/peakpro/charts';
import { PeakProAdvisorChat } from '@/components/peakpro/advisor-chat';
import { PeakProEquityDesk } from '@/components/peakpro/equity-desk';
import { PeakProPortfolioDesk } from '@/components/peakpro/portfolio-desk';
import { PeakProFilingsDesk } from '@/components/peakpro/filings-desk';
import { PeakProLearnDesk } from '@/components/peakpro/learn-desk';
import { PeakProConceptsDesk } from '@/components/peakpro/concepts-desk';
import { PeakProTapeDesk } from '@/components/peakpro/tape-desk';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { pricedTrending } from '@/lib/peakpro/market-trending';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';
import Link from 'next/link';

function SeriesCard({
  locale,
  row,
  usdTwd,
}: {
  locale: Locale;
  row: MarketDataRow;
  usdTwd?: number | null;
}) {
  const payload = row.payload;
  const up = payload.changePct >= 0;
  const href =
    row.asset_class === 'equity'
      ? `/app/${isTaiwanSymbol(row.symbol) ? 'taiwan' : 'us'}/${encodeURIComponent(row.symbol)}`
      : row.asset_class === 'crypto'
        ? `/app/crypto/${encodeURIComponent(row.symbol)}`
        : null;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{row.symbol}</p>
          <h3 className="mt-1 font-peakpro text-xl text-white">{payload.name}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">{row.timeframe}</p>
        </div>
        <div className="text-right">
          <p className="font-peakpro text-2xl text-gold">{displayPx(payload.last, payload.currency, locale, usdTwd)}</p>
          <p className={up ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>{formatPct(payload.changePct)}</p>
        </div>
      </div>
      <div className="mt-4">
        <SparkCandles bars={payload.bars} />
      </div>
      {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis) ? (
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis)}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-gold/15 bg-black/60 p-5 transition-colors hover:border-gold/50"
      >
        {body}
      </Link>
    );
  }

  return <article className="rounded-2xl border border-gold/15 bg-black/60 p-5">{body}</article>;
}

function TrendingBoard({
  locale,
  titleKey,
  items,
  usdTwd,
}: {
  locale: Locale;
  titleKey: 'trendingTaiwan' | 'trendingUs';
  items: TrendingItem[];
  usdTwd?: number | null;
}) {
  return (
    <section>
      <h3 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, titleKey)}</h3>
      {items.length === 0 ? (
        <EmptyCache locale={locale} />
      ) : (
        <ol className="space-y-3">
          {items.map((item) => {
            const market = item.market ?? (isTaiwanSymbol(item.symbol) ? 'taiwan' : 'us');
            return (
              <li key={`${market}-${item.symbol}-${item.rank}`}>
                <Link
                  href={`/app/${market}/${encodeURIComponent(item.symbol)}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-gold/15 bg-black/60 px-5 py-4 transition-colors hover:border-gold/50"
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
                  <div className="text-right">
                    {item.last != null ? (
                      <p className="font-peakpro text-lg text-gold">
                        {displayPx(item.last, item.currency ?? (market === 'taiwan' ? 'TWD' : 'USD'), locale, usdTwd)}
                      </p>
                    ) : null}
                    <p className={item.changePct >= 0 ? 'font-peakpro text-2xl text-emerald-400' : 'font-peakpro text-2xl text-red-400'}>
                      {formatPct(item.changePct)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function EmptyCache({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-gold/15 px-6 py-16 text-center text-sm text-zinc-500">
      {tPeakpro(locale, 'emptyCache')}
    </div>
  );
}

function SentimentCard({
  locale,
  titleKey,
  data,
  kind,
}: {
  locale: Locale;
  titleKey: 'fearTaiwan' | 'fearUs' | 'fearCrypto';
  data: SentimentGauge | Pick<FearGreedPayload, 'value' | 'classification' | 'classificationZh'> | null;
  kind: 'desk' | 'crypto';
}) {
  const gauge = data
    ? {
        value: data.value,
        classification: data.classification,
        classificationZh: data.classificationZh,
      }
    : null;
  const sample = kind === 'desk' && data && 'sampleSize' in data ? data : null;

  return (
    <article className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-6">
      <p className="text-center text-[11px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, titleKey)}</p>
      {gauge ? (
        <FearGreedGauge data={gauge} locale={locale} compact />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-zinc-500">{tPeakpro(locale, 'emptyCache')}</p>
      )}
      {sample && sample.sampleSize > 0 ? (
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          {sample.sampleSize} {tPeakpro(locale, 'fearSample')}
          {sample.avgChangePct != null ? ` · ${tPeakpro(locale, 'fearAvg')} ${formatPct(sample.avgChangePct)}` : ''}
        </p>
      ) : null}
    </article>
  );
}

export function PeakProModuleView({
  locale,
  tier,
  moduleId,
  cache,
  highlight,
}: {
  locale: Locale;
  tier: PeakProTier;
  moduleId: PeakProModule;
  cache: PeakProCacheSnapshot;
  highlight?: string;
}) {
  const locked =
    !canAccessModule(tier, moduleId) && moduleId !== 'overview' && moduleId !== 'us' && moduleId !== 'learn';

  if (locked) {
    return (
      <PeakProPaywall locale={locale}>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {cache.equities.slice(0, 4).map((row) => (
            <SeriesCard key={row.id} locale={locale} row={row} usdTwd={cache.usdTwd} />
          ))}
        </div>
      </PeakProPaywall>
    );
  }

  if (moduleId === 'overview') {
    const deskSymbols = new Set<string>(EQUITY_UNIVERSE.map((row) => row.symbol));
    const freeMonthly = cache.equities.filter(
      (row) => deskSymbols.has(row.symbol) && canAccessEquity(tier, row.symbol, row.timeframe),
    );
    return (
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">
            {tPeakpro(locale, 'monthlyOnly')}
          </h2>
          {freeMonthly.length === 0 ? (
            <EmptyCache locale={locale} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {freeMonthly.map((row) => (
                <SeriesCard key={row.id} locale={locale} row={row} usdTwd={cache.usdTwd} />
              ))}
            </div>
          )}
        </section>
        {tier === 'free' ? (
          <PeakProPaywall locale={locale} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cache.crypto.slice(0, 2).map((row) => (
              <SeriesCard key={row.id} locale={locale} row={row} usdTwd={cache.usdTwd} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'taiwan' || moduleId === 'us') {
    const rows = cache.equities.filter((row) =>
      moduleId === 'taiwan' ? isTaiwanSymbol(row.symbol) : !isTaiwanSymbol(row.symbol),
    );
    return (
      <PeakProEquityDesk
        locale={locale}
        tier={tier}
        market={moduleId}
        rows={rows}
        highlight={highlight}
      />
    );
  }

  if (moduleId === 'crypto') {
    return (
      <div className="space-y-6">
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'cryptoTitle')}</h2>
        {cache.crypto.length === 0 ? <EmptyCache locale={locale} /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {cache.crypto.map((row) => (
              <SeriesCard key={row.id} locale={locale} row={row} usdTwd={cache.usdTwd} />
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
              <SeriesCard key={row.id} locale={locale} row={row} usdTwd={cache.usdTwd} />
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
        {tPeakpro(locale, 'newsLead') ? (
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'newsLead')}</p>
        ) : null}
        {cache.news.length === 0 ? <EmptyCache locale={locale} /> : (
          <div className="space-y-4">
            {cache.news.map((item) => (
              <Link
                key={item.id}
                href={`/app/geopolitics/${encodeURIComponent(item.id)}`}
                className="block rounded-2xl border border-gold/15 bg-black/60 p-5 transition-colors hover:border-gold/50"
              >
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">
                  {newsCategoryLabel(locale, item.category)} · {newsSourceLabel(locale, item.source)}
                </p>
                <h3 className="mt-2 font-peakpro text-xl text-white">
                  {localizedNewsText(locale, item.title, item.title_zh)}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                  {localizedNewsText(locale, item.summary, item.summary_zh)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'sentiment') {
    const payload = cache.fearGreed?.payload as unknown as FearGreedPayload | undefined;
    const deskBias = deskBiasGauges(cache.equities);
    const taiwanBias = payload?.taiwan?.sampleSize ? payload.taiwan : deskBias.taiwan;
    const usBias = payload?.us?.sampleSize ? payload.us : deskBias.us;
    const hasAnything = Boolean(payload) || taiwanBias.sampleSize + usBias.sampleSize > 0;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'fearTitle')}</h2>
          {tPeakpro(locale, 'fearLead') ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'fearLead')}</p>
          ) : null}
        </div>
        {!hasAnything ? (
          <EmptyCache locale={locale} />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <SentimentCard
              locale={locale}
              titleKey="fearTaiwan"
              data={taiwanBias.sampleSize > 0 ? taiwanBias : null}
              kind="desk"
            />
            <SentimentCard
              locale={locale}
              titleKey="fearUs"
              data={usBias.sampleSize > 0 ? usBias : null}
              kind="desk"
            />
            <SentimentCard
              locale={locale}
              titleKey="fearCrypto"
              data={payload ?? null}
              kind="crypto"
            />
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'trending') {
    const payload = cache.trending?.payload as unknown as TrendingPayload | undefined;
    const taiwan = pricedTrending(
      payload?.taiwan?.length ? payload.taiwan : payload?.items?.filter((item) => isTaiwanSymbol(item.symbol)),
    ).map((item, index) => ({ ...item, rank: index + 1 }));
    const us = pricedTrending(
      payload?.us?.length
        ? payload.us
        : payload?.items?.filter((item) => item.assetClass === 'equity' && !isTaiwanSymbol(item.symbol)),
    ).map((item, index) => ({ ...item, rank: index + 1 }));
    const empty = taiwan.length + us.length === 0;
    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'trendingTitle')}</h2>
          {tPeakpro(locale, 'trendingLead') ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'trendingLead')}</p>
          ) : null}
        </div>
        {empty ? (
          <EmptyCache locale={locale} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <TrendingBoard locale={locale} titleKey="trendingTaiwan" items={taiwan} usdTwd={cache.usdTwd} />
            <TrendingBoard locale={locale} titleKey="trendingUs" items={us} usdTwd={cache.usdTwd} />
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'filings') {
    return (
      <PeakProFilingsDesk
        locale={locale}
        payload={(cache.filings?.payload as unknown as FilingsPayload | undefined) ?? null}
      />
    );
  }

  if (moduleId === 'portfolio') {
    return <PeakProPortfolioDesk locale={locale} />;
  }

  if (moduleId === 'tape') {
    return <PeakProTapeDesk locale={locale} />;
  }

  if (moduleId === 'learn') {
    return <PeakProLearnDesk locale={locale} />;
  }

  if (moduleId === 'concepts') {
    return <PeakProConceptsDesk locale={locale} />;
  }

  if (moduleId === 'advisor') {
    return <PeakProAdvisorChat locale={locale} />;
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
  usdTwd,
}: {
  locale: Locale;
  titleKey: string;
  rows: MarketDataRow[];
  usdTwd?: number | null;
}) {
  return (
    <section>
      <h3 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, titleKey)}</h3>
      {rows.length === 0 ? (
        <EmptyCache locale={locale} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <SeriesCard key={row.id} locale={locale} row={row} usdTwd={usdTwd} />
          ))}
        </div>
      )}
    </section>
  );
}
