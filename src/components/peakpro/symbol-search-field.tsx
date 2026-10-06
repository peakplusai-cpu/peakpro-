'use client';

import { useEffect, useRef, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import type { SymbolHit } from '@/lib/peakpro/symbol-search';
import type { EquityMarket } from '@/lib/peakpro/yahoo';
import { cn } from '@/lib/utils';

export function SymbolSearchField({
  locale: _locale,
  market,
  value,
  onChange,
  onPick,
  placeholder,
  disabled,
  className,
  variant = 'pill',
}: {
  locale: Locale;
  market: EquityMarket;
  value: string;
  onChange: (value: string) => void;
  onPick?: (hit: SymbolHit) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  variant?: 'pill' | 'box';
}) {
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const q = value.trim();
    const enough = /[\u3400-\u9fff]/.test(q) ? q.length >= 1 : q.length >= 2;
    if (!enough) {
      setHits([]);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void (async () => {
        const response = await fetch(
          `/api/equities/search?market=${encodeURIComponent(market)}&q=${encodeURIComponent(q)}`,
          { credentials: 'same-origin' },
        );
        const json = (await response.json().catch(() => null)) as { matches?: SymbolHit[] } | null;
        if (!response.ok) return;
        setHits(json?.matches ?? []);
        setOpen(true);
      })();
    }, 280);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [market, value]);

  return (
    <div className={cn('relative flex-1', className)}>
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
        className={cn(
          'w-full border border-gold/25 bg-black text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gold disabled:opacity-60',
          variant === 'box' ? 'rounded-2xl px-3 py-2' : 'h-11 rounded-full px-4',
        )}
      />
      {open && hits.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-gold/20 bg-zinc-950 py-1 shadow-2xl">
          {hits.map((hit) => (
            <li key={hit.symbol}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left hover:bg-gold/10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(hit.symbol);
                  setOpen(false);
                  onPick?.(hit);
                }}
              >
                <span className="font-peakpro text-sm text-gold">{hit.symbol}</span>
                <span className="truncate text-xs text-zinc-400">{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
