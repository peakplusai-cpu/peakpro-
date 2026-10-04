'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { FilingBook, FilingTrade, FilingsPayload } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

type OpenPerson =
  | { kind: 'politician'; key: string }
  | { kind: 'investor'; key: string }
  | null;

function sideLabel(locale: Locale, side: FilingTrade['side']) {
  if (side === 'buy') return tPeakpro(locale, 'filingsBuy');
  if (side === 'sell') return tPeakpro(locale, 'filingsSell');
  return tPeakpro(locale, 'filingsOther');
}

function chamberLabel(locale: Locale, chamber: FilingTrade['chamber']) {
  if (chamber === 'senate') return tPeakpro(locale, 'filingsSenate');
  if (chamber === 'exec') return tPeakpro(locale, 'filingsExec');
  return tPeakpro(locale, 'filingsHouse');
}

function money(usd: number) {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(usd / 1000)}k`;
}

function politicianKey(person: string, chamber: FilingTrade['chamber']) {
  return `${person}|${chamber}`;
}

function groupPoliticians(trades: FilingTrade[]) {
  const map = new Map<string, { person: string; chamber: FilingTrade['chamber']; trades: FilingTrade[] }>();
  for (const trade of trades) {
    const key = politicianKey(trade.person, trade.chamber);
    const row = map.get(key) ?? { person: trade.person, chamber: trade.chamber, trades: [] };
    row.trades.push(trade);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.person.localeCompare(b.person));
}

function TickerName({ ticker, issuer }: { ticker: string; issuer: string }) {
  const label = ticker || issuer;
  if (ticker) {
    return (
      <Link href={`/app/us/${encodeURIComponent(ticker)}`} className="text-white hover:text-gold">
        {label}
        {issuer && issuer !== ticker ? <span className="ml-2 text-zinc-500">{issuer}</span> : null}
      </Link>
    );
  }
  return <span className="text-white">{issuer}</span>;
}

export function PeakProFilingsDesk({ locale, payload }: { locale: Locale; payload: FilingsPayload | null }) {
  const [tab, setTab] = useState<'politicians' | 'investors'>('politicians');
  const [open, setOpen] = useState<OpenPerson>(null);
  const people = useMemo(() => groupPoliticians(payload?.trades ?? []), [payload?.trades]);
  const books = payload?.books ?? [];

  const politician = open?.kind === 'politician' ? people.find((row) => politicianKey(row.person, row.chamber) === open.key) : null;
  const book = open?.kind === 'investor' ? books.find((row) => row.cik === open.key) : null;

  if (politician) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'filingsBack')}
        </button>
        <header>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{chamberLabel(locale, politician.chamber)}</p>
          <h2 className="mt-2 font-peakpro text-3xl text-gold">{politician.person}</h2>
        </header>
        <div className="space-y-3">
          {politician.trades.map((trade, index) => (
            <article
              key={`${trade.ticker}-${trade.side}-${trade.amount}-${index}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gold/15 bg-black/60 px-5 py-4"
            >
              <TickerName ticker={trade.ticker} issuer={trade.issuer} />
              <div className="shrink-0 text-right">
                <p
                  className={
                    trade.side === 'buy'
                      ? 'text-sm text-emerald-400'
                      : trade.side === 'sell'
                        ? 'text-sm text-red-400'
                        : 'text-sm text-zinc-400'
                  }
                >
                  {sideLabel(locale, trade.side)}
                </p>
                <p className="mt-1 text-sm text-zinc-200">{trade.amount}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (book) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'filingsBack')}
        </button>
        <header>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{book.principal}</p>
          <h2 className="mt-2 font-peakpro text-3xl text-gold">{locale === 'zh' ? book.nameZh : book.name}</h2>
        </header>
        <div className="space-y-3">
          {book.holdings.map((row) => (
            <article
              key={`${book.cik}-${row.issuer}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gold/15 bg-black/60 px-5 py-4"
            >
              <TickerName ticker={row.ticker} issuer={row.issuer} />
              <p className="shrink-0 text-sm text-zinc-300">{money(row.valueUsd000)}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const empty = tab === 'politicians' ? people.length === 0 : books.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'filingsTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['politicians', 'filingsPoliticians'],
            ['investors', 'filingsInvestors'],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs tracking-wide',
              tab === id ? 'bg-gold text-black' : 'border border-gold/25 text-zinc-400 hover:text-gold',
            )}
          >
            {tPeakpro(locale, key)}
          </button>
        ))}
      </div>
      {empty ? (
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'emptyCache')}</p>
      ) : tab === 'politicians' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((row) => (
            <button
              key={politicianKey(row.person, row.chamber)}
              type="button"
              onClick={() => setOpen({ kind: 'politician', key: politicianKey(row.person, row.chamber) })}
              className="rounded-2xl border border-gold/15 bg-black/60 px-5 py-6 text-left transition-colors hover:border-gold/50"
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{chamberLabel(locale, row.chamber)}</p>
              <h3 className="mt-2 font-peakpro text-xl text-gold">{row.person}</h3>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((row) => (
            <button
              key={row.cik}
              type="button"
              onClick={() => setOpen({ kind: 'investor', key: row.cik })}
              className="rounded-2xl border border-gold/15 bg-black/60 px-5 py-6 text-left transition-colors hover:border-gold/50"
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{row.principal}</p>
              <h3 className="mt-2 font-peakpro text-xl text-gold">{locale === 'zh' ? row.nameZh : row.name}</h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
