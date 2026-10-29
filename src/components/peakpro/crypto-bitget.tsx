'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { BitgetAuthorizedLockup } from '@/components/peakpro/bitget-brand';
import { PeakProBiasMeter } from '@/components/peakpro/bias-meter';
import { SparkCandles } from '@/components/peakpro/charts';
import { Delta } from '@/components/peakpro/delta';
import { usePeakPro } from '@/components/peakpro/provider';
import type { Locale } from '@/i18n/locale';
import type { BitgetCryptoDesk, BitgetNameTape, BitgetQuote, BitgetSearchHit } from '@/lib/peakpro/bitget';
import { tPeakpro } from '@/lib/peakpro/copy';
import { toDisplayAmount } from '@/lib/peakpro/format';
import type { MarketDataRow } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

function cryptoPx(value: number, locale: Locale, usdTwd?: number | null) {
  const amount = toDisplayAmount(value, 'USD', locale, usdTwd);
  const digits = amount >= 1000 ? 2 : amount >= 1 ? 4 : amount >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    style: 'currency',
    currency: locale === 'zh' && usdTwd && usdTwd > 0 ? 'TWD' : 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.min(2, digits),
  }).format(amount);
}

const POLL_MS = 20_000;

function formatFunding(rate: number | null) {
  if (rate == null || !Number.isFinite(rate)) return null;
  return `${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(4)}%`;
}

function QuoteBlock({
  locale,
  label,
  quote,
  showFunding,
}: {
  locale: Locale;
  label: string;
  quote: BitgetQuote | null;
  showFunding?: boolean;
}) {
  const { usdTwd } = usePeakPro();
  const funding = showFunding ? formatFunding(quote?.fundingRate ?? null) : null;
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-xl tabular-nums text-ice sm:text-2xl">
        {quote?.last ? cryptoPx(quote.last, locale, usdTwd) : '—'}
      </p>
      {quote ? <Delta value={quote.changePct} className="font-mono text-[11px]" /> : null}
      {funding ? (
        <p className="mt-1 font-mono text-[10px] text-zinc-500">
          {tPeakpro(locale, 'bitgetFunding')} {funding}
        </p>
      ) : null}
    </div>
  );
}

function CryptoSearchField({
  value,
  onChange,
  onPick,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (hit: BitgetSearchHit) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [hits, setHits] = useState<BitgetSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void (async () => {
        const response = await fetch(`/api/crypto/search?q=${encodeURIComponent(q)}`, { credentials: 'same-origin' });
        const json = (await response.json().catch(() => null)) as { matches?: BitgetSearchHit[] } | null;
        if (!response.ok) return;
        setHits(json?.matches ?? []);
        setOpen(true);
      })();
    }, 220);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value]);

  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="peakpro-input !h-11 disabled:opacity-60"
      />
      {open && hits.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto border border-signal/30 bg-void-panel py-1 shadow-[0_0_40px_rgba(77,240,255,0.14)]">
          {hits.map((hit) => (
            <li key={hit.pair}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left hover:bg-signal/10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(hit.symbol);
                  setOpen(false);
                  onPick(hit);
                }}
              >
                <span className="font-mono text-sm text-signal">{hit.symbol}</span>
                <span className="truncate text-xs text-zinc-400">{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PeakProCryptoBitgetPanel({
  locale,
  symbol,
  size = 'md',
}: {
  locale: Locale;
  symbol: string;
  size?: 'sm' | 'md';
}) {
  const [tape, setTape] = useState<BitgetNameTape | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const response = await fetch(`/api/crypto/bitget?symbol=${encodeURIComponent(symbol)}`, {
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('bitget');
        const json = (await response.json()) as BitgetNameTape;
        if (!cancelled) {
          setTape(json);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [symbol]);

  const compact = size === 'sm';

  if (!tape) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
        {failed ? tPeakpro(locale, 'bitgetMissing') : tPeakpro(locale, 'bitgetVenue')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
        {tPeakpro(locale, 'bitgetVenue')} · {tape.pair}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <QuoteBlock locale={locale} label={tPeakpro(locale, 'bitgetSpot')} quote={tape.spot} />
        <QuoteBlock locale={locale} label={tPeakpro(locale, 'bitgetPerp')} quote={tape.perp} showFunding />
      </div>
      <PeakProBiasMeter
        locale={locale}
        rank={tape.spot.rank}
        size={compact ? 'sm' : 'md'}
        title={tPeakpro(locale, 'biasSpotLong')}
      />
      <PeakProBiasMeter
        locale={locale}
        rank={tape.perp.rank}
        size={compact ? 'sm' : 'md'}
        title={tPeakpro(locale, 'biasPerp')}
      />
    </div>
  );
}

function LeaderCard({
  locale,
  row,
  spark,
}: {
  locale: Locale;
  row: BitgetNameTape;
  spark?: MarketDataRow;
}) {
  const { usdTwd } = usePeakPro();
  return (
    <Link href={`/app/crypto/${encodeURIComponent(row.symbol)}`} className="peakpro-panel block p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-signal">{row.symbol}</p>
          <h3 className="mt-1 font-peakpro text-xl font-semibold tracking-tight text-ice">{row.name}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl tabular-nums text-ice">
            {row.perp.last ? cryptoPx(row.perp.last, locale, usdTwd) : '—'}
          </p>
          <Delta value={row.perp.changePct} className="font-mono text-[11px]" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <p>
          {tPeakpro(locale, 'bitgetSpot')}{' '}
          <span className="text-ice">{row.spot.last ? cryptoPx(row.spot.last, locale, usdTwd) : '—'}</span>
        </p>
        <p>
          {tPeakpro(locale, 'bitgetPerp')}{' '}
          <span className="text-ice">{row.perp.last ? cryptoPx(row.perp.last, locale, usdTwd) : '—'}</span>
        </p>
      </div>
      {spark && spark.payload.bars.length >= 2 ? (
        <div className="mt-4">
          <SparkCandles bars={spark.payload.bars} />
        </div>
      ) : null}
    </Link>
  );
}

export function PeakProCryptoDesk({
  locale,
  rows,
  heading = true,
  limit,
}: {
  locale: Locale;
  rows: MarketDataRow[];
  heading?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const [desk, setDesk] = useState<BitgetCryptoDesk | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const response = await fetch('/api/crypto/bitget', { credentials: 'same-origin' });
        if (!response.ok) throw new Error('bitget');
        const json = (await response.json()) as BitgetCryptoDesk;
        if (!cancelled) {
          setDesk(json);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const names = (desk?.names ?? []).slice(0, limit);
  const filtered = query.trim()
    ? names.filter((row) => {
        const needle = query.trim().toUpperCase();
        return row.symbol.includes(needle) || row.name.toUpperCase().includes(needle) || row.pair.includes(needle);
      })
    : names;

  function openSymbol(symbol: string) {
    setMessage(null);
    router.push(`/app/crypto/${encodeURIComponent(symbol)}`);
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    const raw = query.trim();
    if (!raw) return;
    const local = (desk?.names ?? []).find(
      (row) =>
        row.symbol === raw.toUpperCase() ||
        row.pair === `${raw.toUpperCase().replace(/USDT$/, '')}USDT`,
    );
    if (local) {
      openSymbol(local.symbol);
      return;
    }
    const response = await fetch(`/api/crypto/search?q=${encodeURIComponent(raw)}`, { credentials: 'same-origin' });
    const json = (await response.json().catch(() => null)) as { matches?: BitgetSearchHit[] } | null;
    const hit = json?.matches?.[0];
    if (!hit) {
      setMessage(tPeakpro(locale, 'searchCryptoNotFound'));
      return;
    }
    openSymbol(hit.symbol);
  }

  return (
    <div className="space-y-6">
      {heading ? (
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">
            {tPeakpro(locale, 'cryptoTitle')}
          </h2>
          <BitgetAuthorizedLockup locale={locale} size="desk" />
        </div>
      ) : null}
      <p className={cn('font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500', heading ? '' : 'pt-1')}>
        {tPeakpro(locale, 'cryptoTop50')}
      </p>
      <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
        <CryptoSearchField
          value={query}
          onChange={setQuery}
          onPick={(hit) => openSymbol(hit.symbol)}
          placeholder={tPeakpro(locale, 'searchPlaceholderCrypto')}
        />
        <button type="submit" className="peakpro-btn">
          {tPeakpro(locale, 'searchCta')}
        </button>
      </form>
      <p className="text-xs text-zinc-500">{tPeakpro(locale, 'searchHintCrypto')}</p>
      {message ? <p className="text-sm text-ice">{message}</p> : null}
      {failed && !desk ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          {tPeakpro(locale, 'bitgetMissing')}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((row) => (
            <LeaderCard
              key={row.pair}
              locale={locale}
              row={row}
              spark={rows.find((item) => item.symbol === row.symbol && item.timeframe === 'daily')}
            />
          ))}
        </div>
      )}
      {limit ? (
        <Link href="/app/crypto" className="inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
          {tPeakpro(locale, 'cryptoAll')}
        </Link>
      ) : null}
    </div>
  );
}
