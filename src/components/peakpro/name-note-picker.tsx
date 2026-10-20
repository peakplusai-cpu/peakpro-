'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { SymbolSearchField } from '@/components/peakpro/symbol-search-field';
import type { Locale } from '@/i18n/locale';
import { EQUITY_UNIVERSE } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { isTaiwanSymbol, type EquityMarket } from '@/lib/peakpro/yahoo';

function marketForQuery(raw: string, desk: DeskRegion): EquityMarket {
  if (desk === 'us') return 'us';
  const q = raw.trim();
  if (/[\u3400-\u9fff]/.test(q) || /^\d{4}/.test(q) || isTaiwanSymbol(q.toUpperCase())) return 'taiwan';
  return 'us';
}

export function PeakProNameNotePicker({ locale, desk }: { locale: Locale; desk: DeskRegion }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const market = marketForQuery(query, desk);
  const chips = EQUITY_UNIVERSE.filter((row) => desk !== 'us' || row.region !== 'Taiwan');

  async function openSymbol(raw: string) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/equities/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ query: raw, market: marketForQuery(raw, desk) }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string; symbol?: string } | null;
      if (response.status === 401) {
        router.push('/login?redirect=/app');
        return;
      }
      if (!response.ok || !json?.symbol) {
        const key =
          json?.error === 'premium'
            ? 'searchPremiumOnly'
            : json?.error === 'wrong_market'
              ? desk === 'us'
                ? 'searchNotFound'
                : 'searchWrongMarketUs'
              : json?.error === 'ambiguous'
                ? 'searchPick'
                : json?.error === 'not_found'
                  ? 'searchNotFound'
                  : 'searchInvalid';
        setMessage(tPeakpro(locale, key));
        return;
      }
      router.push(`/app/notes/${encodeURIComponent(json.symbol)}`);
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await openSymbol(query);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="peakpro-kicker">{tPeakpro(locale, 'nameTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'nameLead')}</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <SymbolSearchField
          locale={locale}
          market={market}
          value={query}
          onChange={setQuery}
          onPick={(hit) => {
            setQuery(hit.symbol);
            void openSymbol(hit.symbol);
          }}
          placeholder={tPeakpro(locale, market === 'taiwan' ? 'searchPlaceholderTw' : 'searchPlaceholderUs')}
          disabled={pending}
          variant="box"
        />
        <button type="submit" disabled={pending} className="peakpro-btn h-11 px-6 disabled:opacity-60">
          {tPeakpro(locale, 'nameCta')}
        </button>
      </form>
      {message ? <p className="text-sm text-gold">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        {chips.map((row) => (
          <button
            key={row.symbol}
            type="button"
            disabled={pending}
            onClick={() => void openSymbol(row.symbol)}
            className="peakpro-chip"
          >
            {row.symbol}
          </button>
        ))}
      </div>
    </section>
  );
}
