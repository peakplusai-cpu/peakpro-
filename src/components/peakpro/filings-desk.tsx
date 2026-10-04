'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { FilingBook, FilingTrade, FilingsPayload } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

function sideLabel(locale: Locale, side: FilingTrade['side']) {
  if (side === 'buy') return tPeakpro(locale, 'filingsBuy');
  if (side === 'sell') return tPeakpro(locale, 'filingsSell');
  return tPeakpro(locale, 'filingsOther');
}

function chamberLabel(locale: Locale, chamber: FilingTrade['chamber']) {
  return tPeakpro(locale, chamber === 'senate' ? 'filingsSenate' : 'filingsHouse');
}

function money(valueUsd000: number) {
  const usd = valueUsd000 * 1000;
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(usd / 1000)}k`;
}

function TradeRow({ locale, trade }: { locale: Locale; trade: FilingTrade }) {
  const href = trade.ticker ? `/app/us/${encodeURIComponent(trade.ticker)}` : null;
  const title = href ? (
    <Link href={href} className="text-white hover:text-gold">
      {trade.ticker || trade.issuer}
    </Link>
  ) : (
    <span className="text-white">{trade.ticker || trade.issuer}</span>
  );

  return (
    <article className="rounded-2xl border border-gold/15 bg-black/60 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">
            {chamberLabel(locale, trade.chamber)}
          </p>
          <h3 className="mt-1 font-peakpro text-xl text-gold">{trade.person}</h3>
          <p className="mt-2 text-sm text-zinc-300">
            {title}
            <span className="text-zinc-500"> · {trade.issuer}</span>
          </p>
        </div>
        <div className="text-right">
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
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {tPeakpro(locale, 'filingsDisclosed')} {trade.disclosed ?? '—'}
        <span className="mx-2 text-zinc-700">/</span>
        {tPeakpro(locale, 'filingsTraded')} {trade.traded ?? '—'}
      </p>
      {trade.href ? (
        <a
          href={trade.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-gold/80 hover:text-gold"
        >
          {tPeakpro(locale, 'filingsLink')}
        </a>
      ) : null}
    </article>
  );
}

function BookCard({ locale, book }: { locale: Locale; book: FilingBook }) {
  return (
    <article className="rounded-2xl border border-gold/15 bg-black/60 p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{book.principal}</p>
      <h3 className="mt-1 font-peakpro text-xl text-gold">{locale === 'zh' ? book.nameZh : book.name}</h3>
      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {tPeakpro(locale, 'filingsAsOf')} {book.filed || '—'}
      </p>
      <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        {tPeakpro(locale, 'filingsHoldings')}
      </p>
      <ol className="mt-3 space-y-2">
        {book.holdings.map((row) => (
          <li key={`${book.cik}-${row.issuer}`} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-zinc-200">
              {row.ticker ? (
                <Link href={`/app/us/${encodeURIComponent(row.ticker)}`} className="hover:text-gold">
                  {row.ticker}
                </Link>
              ) : (
                row.issuer
              )}
              <span className="ml-2 text-zinc-500">{row.issuer}</span>
            </span>
            <span className="shrink-0 text-zinc-400">{money(row.valueUsd000)}</span>
          </li>
        ))}
      </ol>
      <a
        href={book.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs text-gold/80 hover:text-gold"
      >
        {tPeakpro(locale, 'filingsLink')}
      </a>
    </article>
  );
}

export function PeakProFilingsDesk({ locale, payload }: { locale: Locale; payload: FilingsPayload | null }) {
  const [tab, setTab] = useState<'politicians' | 'investors'>('politicians');
  const trades = payload?.trades ?? [];
  const books = payload?.books ?? [];
  const empty = tab === 'politicians' ? trades.length === 0 : books.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'filingsTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'filingsLead')}</p>
      </div>
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
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'filingsEmpty')}</p>
      ) : tab === 'politicians' ? (
        <div className="space-y-3">
          {trades.map((trade, index) => (
            <TradeRow
              key={`${trade.person}-${trade.ticker}-${trade.disclosed}-${trade.traded}-${index}`}
              locale={locale}
              trade={trade}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {books.map((book) => (
            <BookCard key={book.cik} locale={locale} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
