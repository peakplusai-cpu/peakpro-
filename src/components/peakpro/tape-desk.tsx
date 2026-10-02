'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { formatPct, formatPx, formatVol, formatZhang } from '@/lib/peakpro/format';
import type { TapeDesk, TapeRow, TapeRs, TapeTurn } from '@/lib/peakpro/tape';
import { cn } from '@/lib/utils';

function turnClass(turn: TapeTurn) {
  if (turn === 'thrust') return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
  if (turn === 'press') return 'border-red-400/40 bg-red-400/10 text-red-300';
  if (turn === 'fade') return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  if (turn === 'first') return 'border-gold/40 bg-gold/10 text-gold';
  return 'border-zinc-700 bg-zinc-900 text-zinc-400';
}

function rsClass(rs: TapeRs) {
  if (rs === 'lead') return 'text-emerald-300';
  if (rs === 'lag') return 'text-red-300';
  return 'text-zinc-400';
}

function streakText(locale: Locale, streak: number) {
  if (streak === 0) return '—';
  const n = Math.abs(streak);
  if (locale === 'zh') return streak > 0 ? `連${n}買` : `連${n}賣`;
  return streak > 0 ? `${n}-day buy` : `${n}-day sell`;
}

function hrefFor(row: TapeRow) {
  return `/app/${row.market}/${encodeURIComponent(row.symbol)}`;
}

function TapeTable({
  locale,
  rows,
}: {
  locale: Locale;
  rows: TapeRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-gold/15">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-black/80 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <tr>
            <th className="px-4 py-3">{tPeakpro(locale, 'bookSymbol')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'last')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeTurn')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeRs')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeVol')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeRange')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeInst')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className={cn('border-t border-gold/10', row.inBook && 'bg-gold/[0.04]')}>
              <td className="px-4 py-3">
                <Link href={hrefFor(row)} className="text-gold hover:underline">
                  {row.symbol}
                </Link>
                <p className="text-xs text-zinc-500">{row.name}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-100">{row.last != null ? formatPx(row.last, row.currency) : '—'}</p>
                <p className={cn('text-xs', (row.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {row.changePct != null ? formatPct(row.changePct) : '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px]', turnClass(row.turn))}>
                  {tPeakpro(locale, `tape_${row.turn}`)}
                </span>
                <p className="mt-1 text-[11px] text-zinc-600">
                  {row.prints} {tPeakpro(locale, 'tapePrints')}
                </p>
              </td>
              <td className={cn('px-4 py-3', rsClass(row.rs))}>
                <p>{tPeakpro(locale, `tape_${row.rs}`)}</p>
                <p className="text-[11px] text-zinc-500">
                  {row.rsPct != null ? formatPct(row.rsPct) : '—'} · {row.benchmark}
                </p>
              </td>
              <td className="px-4 py-3 text-zinc-300">
                <p>{formatVol(row.volume, row.market)}</p>
                <p className="text-[11px] text-zinc-500">
                  {row.volumeRatio != null ? `${row.volumeRatio.toFixed(2)}×` : '—'}
                </p>
              </td>
              <td className="px-4 py-3 text-zinc-300">
                {row.rangePos != null ? `${Math.round(row.rangePos * 100)}%` : '—'}
              </td>
              <td className="px-4 py-3">
                {row.market === 'us' ? (
                  <p className="text-[11px] text-zinc-600">{tPeakpro(locale, 'tapeNoInst')}</p>
                ) : row.inst ? (
                  <>
                    <p className={row.inst.totalNet >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {formatZhang(row.inst.totalNet)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {tPeakpro(locale, 'tapeForeign')} {formatZhang(row.inst.foreignNet)} ·{' '}
                      {streakText(locale, row.inst.streak)}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-zinc-600">{tPeakpro(locale, 'tapePendingInst')}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PeakProTapeDesk({ locale }: { locale: Locale }) {
  const [desk, setDesk] = useState<TapeDesk | null>(null);
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch('/api/tape', { credentials: 'same-origin' });
      const json = (await response.json().catch(() => null)) as {
        error?: string;
        setup?: boolean;
        desk?: TapeDesk;
      } | null;
      if (cancelled) return;
      if (!response.ok) {
        setError(json?.error === 'premium' ? tPeakpro(locale, 'lockedTitle') : tPeakpro(locale, 'tapeEmpty'));
        setLoading(false);
        return;
      }
      setSetup(Boolean(json?.setup));
      setDesk(json?.desk ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const book = desk?.rows.filter((row) => row.inBook) ?? [];
  const rest = desk?.rows.filter((row) => !row.inBook) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'tapeTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'tapeLead')}</p>
      </div>

      {setup ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {tPeakpro(locale, 'tapeSetup')}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'tapeLoading')}</p>
      ) : error ? (
        <p className="rounded-2xl border border-gold/15 px-6 py-12 text-center text-sm text-zinc-500">{error}</p>
      ) : !desk || desk.rows.every((row) => row.prints === 0 && !row.inst) ? (
        <p className="rounded-2xl border border-gold/15 px-6 py-12 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'tapeEmpty')}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, 'tapeTaiwan')}</p>
              <p className="mt-3 font-peakpro text-2xl text-white">
                {desk.summary.twLead} {tPeakpro(locale, 'tapeLeadCount')}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {desk.summary.twLag} {tPeakpro(locale, 'tapeLagCount')}
                {desk.benches.taiwan.changePct != null
                  ? ` · 0050 ${formatPct(desk.benches.taiwan.changePct)}`
                  : ''}
              </p>
            </article>
            <article className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, 'tapeUs')}</p>
              <p className="mt-3 font-peakpro text-2xl text-white">
                {desk.summary.usLead} {tPeakpro(locale, 'tapeLeadCount')}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {desk.summary.usLag} {tPeakpro(locale, 'tapeLagCount')}
                {desk.benches.us.changePct != null ? ` · QQQ ${formatPct(desk.benches.us.changePct)}` : ''}
              </p>
            </article>
            <article className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, 'tapeBookPulse')}</p>
              <p className="mt-3 font-peakpro text-2xl text-emerald-300">
                {desk.summary.bookThrust} {tPeakpro(locale, 'tape_thrust')}
              </p>
              <p className="mt-1 text-sm text-red-300">
                {desk.summary.bookPress} {tPeakpro(locale, 'tape_press')}
              </p>
              {desk.instDate ? (
                <p className="mt-2 text-[11px] text-zinc-600">
                  {tPeakpro(locale, 'tapeInstDate')} {desk.instDate}
                </p>
              ) : null}
            </article>
          </div>

          {book.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, 'tapeBook')}</h3>
              <TapeTable locale={locale} rows={book} />
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, 'tapeDesk')}</h3>
            {rest.length === 0 ? (
              <p className="rounded-2xl border border-gold/15 px-6 py-10 text-center text-sm text-zinc-500">
                {tPeakpro(locale, 'tapeEmpty')}
              </p>
            ) : (
              <TapeTable locale={locale} rows={rest} />
            )}
          </section>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'tapeFoot')}</p>
    </div>
  );
}
