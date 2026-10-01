'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { formatPct, formatPx } from '@/lib/peakpro/format';
import type { MarkedLot, PortfolioBook } from '@/lib/peakpro/portfolio';
import { cn } from '@/lib/utils';

const BOOKS: PortfolioBook[] = ['taiwan', 'us', 'crypto', 'gold'];

type Totals = {
  TWD: { cost: number; market: number; pnl: number };
  USD: { cost: number; market: number; pnl: number };
};

function lotHref(lot: MarkedLot) {
  if (lot.book === 'taiwan') return `/app/taiwan/${encodeURIComponent(lot.symbol)}`;
  if (lot.book === 'us') return `/app/us/${encodeURIComponent(lot.symbol)}`;
  if (lot.book === 'crypto') return '/app/crypto';
  return '/app/gold';
}

export function PeakProPortfolioDesk({ locale }: { locale: Locale }) {
  const [lots, setLots] = useState<MarkedLot[]>([]);
  const [totals, setTotals] = useState<Totals>({
    TWD: { cost: 0, market: 0, pnl: 0 },
    USD: { cost: 0, market: 0, pnl: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<PortfolioBook>('taiwan');
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [boughtOn, setBoughtOn] = useState('');

  function errorText(code: string | undefined) {
    if (code === 'setup') return tPeakpro(locale, 'bookSetup');
    if (code === 'limit') return tPeakpro(locale, 'bookLimit');
    if (code === 'not_found') return tPeakpro(locale, 'bookNotFound');
    if (code === 'wrong_market') return tPeakpro(locale, 'bookWrongMarket');
    if (code === 'premium') return tPeakpro(locale, 'lockedTitle');
    return tPeakpro(locale, 'bookFailed');
  }

  async function refresh() {
    const response = await fetch('/api/portfolio', { credentials: 'same-origin' });
    const json = (await response.json().catch(() => null)) as {
      error?: string;
      lots?: MarkedLot[];
      totals?: Totals;
    } | null;
    if (!response.ok) {
      setError(errorText(json?.error));
      setLots(json?.lots ?? []);
      if (json?.totals) setTotals(json.totals);
      return;
    }
    setError(null);
    setLots(json?.lots ?? []);
    if (json?.totals) setTotals(json.totals);
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          book,
          query,
          quantity,
          cost,
          bought_on: boughtOn || null,
        }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(errorText(json?.error));
        return;
      }
      setQuery('');
      setQuantity('');
      setCost('');
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        setError(tPeakpro(locale, 'bookFailed'));
        return;
      }
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'bookTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'bookLead')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(['TWD', 'USD'] as const).map((ccy) => {
          const row = totals[ccy];
          const pct = row.cost > 0 ? (row.pnl / row.cost) * 100 : 0;
          return (
            <article key={ccy} className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{ccy}</p>
              <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'bookCost')}</p>
              <p className="font-peakpro text-2xl text-white">{formatPx(row.cost, ccy)}</p>
              <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'bookMarket')}</p>
              <p className="font-peakpro text-2xl text-gold">{formatPx(row.market, ccy)}</p>
              <p className={cn('mt-2 text-sm', row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatPx(row.pnl, ccy)} ({formatPct(pct)})
              </p>
            </article>
          );
        })}
      </div>

      <form onSubmit={onAdd} className="rounded-3xl border border-gold/15 bg-black/60 p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, 'bookAdd')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <select
            value={book}
            onChange={(event) => setBook(event.target.value as PortfolioBook)}
            className="rounded-2xl border border-gold/20 bg-black px-3 py-2 text-sm"
          >
            {BOOKS.map((item) => (
              <option key={item} value={item}>
                {tPeakpro(locale, `book_${item}`)}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tPeakpro(locale, 'bookSymbol')}
            className="rounded-2xl border border-gold/20 bg-black px-3 py-2 text-sm"
          />
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={tPeakpro(locale, 'bookQty')}
            inputMode="decimal"
            className="rounded-2xl border border-gold/20 bg-black px-3 py-2 text-sm"
          />
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder={tPeakpro(locale, 'bookUnitCost')}
            inputMode="decimal"
            className="rounded-2xl border border-gold/20 bg-black px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={boughtOn}
            onChange={(event) => setBoughtOn(event.target.value)}
            className="rounded-2xl border border-gold/20 bg-black px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {pending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : tPeakpro(locale, 'bookSave')}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'bookLoading')}</p>
      ) : lots.length === 0 ? (
        <p className="rounded-2xl border border-gold/15 px-6 py-12 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'bookEmpty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gold/15">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-black/80 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">{tPeakpro(locale, 'bookSymbol')}</th>
                <th className="px-4 py-3">{tPeakpro(locale, 'bookQty')}</th>
                <th className="px-4 py-3">{tPeakpro(locale, 'bookUnitCost')}</th>
                <th className="px-4 py-3">{tPeakpro(locale, 'last')}</th>
                <th className="px-4 py-3">{tPeakpro(locale, 'bookPnl')}</th>
                <th className="px-4 py-3">{tPeakpro(locale, 'bookDate')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-t border-gold/10">
                  <td className="px-4 py-3">
                    <Link href={lotHref(lot)} className="text-gold hover:underline">
                      {lot.symbol}
                    </Link>
                    <p className="text-xs text-zinc-500">{lot.name}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{lot.quantity}</td>
                  <td className="px-4 py-3 text-zinc-200">{formatPx(lot.cost, lot.currency)}</td>
                  <td className="px-4 py-3 text-zinc-200">
                    {lot.last != null ? formatPx(lot.last, lot.currency) : '—'}
                  </td>
                  <td className={cn('px-4 py-3', (lot.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {lot.pnl != null ? `${formatPx(lot.pnl, lot.currency)} (${formatPct(lot.pnlPct ?? 0)})` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{lot.bought_on ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void onDelete(lot.id)}
                      className="text-zinc-500 hover:text-red-300"
                      aria-label={tPeakpro(locale, 'bookDelete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'bookFoot')}</p>
    </div>
  );
}
