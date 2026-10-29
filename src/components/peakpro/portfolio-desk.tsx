'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { TRADE_APP_PATH } from '@/lib/peakpro/constants';
import { tPeakpro, tPeakproDesk } from '@/lib/peakpro/copy';
import { Delta } from '@/components/peakpro/delta';
import { Notice } from '@/components/peakpro/notice';
import { usePeakPro } from '@/components/peakpro/provider';
import { SymbolSearchField } from '@/components/peakpro/symbol-search-field';
import { displayPx, formatPct } from '@/lib/peakpro/format';
import type { MarkedLot, PortfolioBook } from '@/lib/peakpro/portfolio';

const BOOKS_TW: PortfolioBook[] = ['taiwan', 'us', 'gold'];
const BOOKS_US: PortfolioBook[] = ['us', 'gold'];

type Totals = {
  TWD: { cost: number; market: number; pnl: number };
  USD: { cost: number; market: number; pnl: number };
};

function lotHref(lot: MarkedLot) {
  if (lot.book === 'taiwan') return `/app/taiwan/${encodeURIComponent(lot.symbol)}`;
  if (lot.book === 'us') return `/app/us/${encodeURIComponent(lot.symbol)}`;
  if (lot.book === 'crypto') {
    return `${TRADE_APP_PATH}/${encodeURIComponent(lot.symbol.replace(/USDT$/i, ''))}`;
  }
  return '/app/gold';
}

export function PeakProPortfolioDesk({ locale }: { locale: Locale }) {
  const { usdTwd, desk } = usePeakPro();
  const books = desk === 'us' ? BOOKS_US : BOOKS_TW;
  const [lots, setLots] = useState<MarkedLot[]>([]);
  const [totals, setTotals] = useState<Totals>({
    TWD: { cost: 0, market: 0, pnl: 0 },
    USD: { cost: 0, market: 0, pnl: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<PortfolioBook>(desk === 'us' ? 'us' : 'taiwan');
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [boughtOn, setBoughtOn] = useState('');

  function errorText(code: string | undefined) {
    if (code === 'setup') return tPeakpro(locale, 'bookSetup');
    if (code === 'limit') return tPeakpro(locale, 'bookLimit');
    if (code === 'not_found') return tPeakpro(locale, 'bookNotFound');
    if (code === 'invalid' || code === 'empty') return tPeakproDesk(locale, desk, 'bookInvalid');
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
        <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">{tPeakpro(locale, 'bookTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          {tPeakproDesk(locale, desk, 'bookLead')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(desk === 'us' ? (['USD'] as const) : (['TWD', 'USD'] as const)).map((ccy) => {
          const row = totals[ccy];
          const pct = row.cost > 0 ? (row.pnl / row.cost) * 100 : 0;
          return (
            <article key={ccy} className="peakpro-panel px-5 py-5">
              <p className="peakpro-kicker">{ccy}</p>
              <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'bookCost')}</p>
              <p className="font-mono text-2xl text-ice">{displayPx(row.cost, ccy, locale, usdTwd)}</p>
              <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'bookMarket')}</p>
              <p className="font-mono text-2xl text-ice">{displayPx(row.market, ccy, locale, usdTwd)}</p>
              <p className="mt-2 text-sm">
                <Delta value={row.pnl}>
                  {displayPx(row.pnl, ccy, locale, usdTwd)} ({formatPct(pct)})
                </Delta>
              </p>
            </article>
          );
        })}
      </div>

      <form onSubmit={onAdd} className="peakpro-box p-5">
        <p className="peakpro-kicker">{tPeakpro(locale, 'bookAdd')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <select
            value={book}
            onChange={(event) => setBook(event.target.value as PortfolioBook)}
            className="peakpro-input !h-10 !px-3"
          >
            {books.map((item) => (
              <option key={item} value={item}>
                {tPeakpro(locale, `book_${item}`)}
              </option>
            ))}
          </select>
          {book === 'taiwan' || book === 'us' ? (
            <SymbolSearchField
              locale={locale}
              market={book}
              value={query}
              onChange={setQuery}
              onPick={(hit) => setQuery(hit.symbol)}
              placeholder={tPeakpro(locale, 'bookSymbol')}
              disabled={pending}
              variant="box"
            />
          ) : (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tPeakpro(locale, book === 'gold' ? 'bookGoldHint' : 'bookCryptoHint')}
              className="peakpro-input !h-10 !px-3"
            />
          )}
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={tPeakpro(locale, 'bookQty')}
            inputMode="decimal"
            className="peakpro-input !h-10 !px-3"
          />
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder={tPeakpro(locale, 'bookUnitCost')}
            inputMode="decimal"
            className="peakpro-input !h-10 !px-3"
          />
          <input
            type="date"
            value={boughtOn}
            onChange={(event) => setBoughtOn(event.target.value)}
            className="peakpro-input !h-10 !px-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="peakpro-btn !px-4 !py-2"
          >
            {pending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : tPeakpro(locale, 'bookSave')}
          </button>
        </div>
        {error ? <Notice role="alert" className="mt-3">{error}</Notice> : null}
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'bookLoading')}</p>
      ) : lots.length === 0 ? (
        <p className="peakpro-panel px-6 py-12 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'bookEmpty')}
        </p>
      ) : (
        <div className="peakpro-panel">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-void/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
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
                <tr key={lot.id} className="border-t border-signal/10">
                  <td className="px-4 py-3">
                    <Link href={lotHref(lot)} className="text-ice hover:underline">
                      {lot.symbol}
                    </Link>
                    <p className="text-xs text-zinc-500">{lot.name}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{lot.quantity}</td>
                  <td className="px-4 py-3 text-zinc-200">{displayPx(lot.cost, lot.currency, locale, usdTwd)}</td>
                  <td className="px-4 py-3 text-zinc-200">
                    {lot.last != null ? displayPx(lot.last, lot.currency, locale, usdTwd) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lot.pnl != null ? (
                      <Delta value={lot.pnl}>
                        {`${displayPx(lot.pnl, lot.currency, locale, usdTwd)} (${formatPct(lot.pnlPct ?? 0)})`}
                      </Delta>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{lot.bought_on ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void onDelete(lot.id)}
                      className="text-zinc-500 hover:text-warn"
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
        </div>
      )}
      {tPeakpro(locale, 'bookFoot') ? (
        <p className="text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'bookFoot')}</p>
      ) : null}
    </div>
  );
}
