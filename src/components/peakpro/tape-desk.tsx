'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro, tPeakproDesk } from '@/lib/peakpro/copy';
import { Delta } from '@/components/peakpro/delta';
import { Notice } from '@/components/peakpro/notice';
import { usePeakPro } from '@/components/peakpro/provider';
import { displayPx, formatPct, formatVol, formatZhang } from '@/lib/peakpro/format';
import type { TapeDesk, TapeRow, TapeRs, TapeTurn } from '@/lib/peakpro/tape';
import { cn } from '@/lib/utils';

function turnClass(turn: TapeTurn) {
  if (turn === 'thrust') return 'border-signal/50 bg-signal/10 text-signal';
  if (turn === 'press') return 'border-plasma/50 bg-plasma/10 text-plasma';
  if (turn === 'fade') return 'border-warn/50 bg-warn/10 text-warn';
  if (turn === 'first') return 'border-ice/40 bg-ice/10 text-ice';
  return 'border-zinc-700 bg-zinc-900 text-zinc-400';
}

function rsClass(rs: TapeRs) {
  if (rs === 'lead') return 'text-signal';
  if (rs === 'lag') return 'text-plasma';
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
  usdTwd,
  hideInst = false,
}: {
  locale: Locale;
  rows: TapeRow[];
  usdTwd?: number | null;
  hideInst?: boolean;
}) {
  return (
    <div className="peakpro-panel">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-void/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          <tr>
            <th className="px-4 py-3">{tPeakpro(locale, 'bookSymbol')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'last')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeTurn')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeRs')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeVol')}</th>
            <th className="px-4 py-3">{tPeakpro(locale, 'tapeRange')}</th>
            {hideInst ? null : <th className="px-4 py-3">{tPeakpro(locale, 'tapeInst')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className={cn('border-t border-signal/10', row.inBook && 'bg-signal/[0.04]')}>
              <td className="px-4 py-3">
                <Link href={hrefFor(row)} className="text-ice hover:underline">
                  {row.symbol}
                </Link>
                <p className="text-xs text-zinc-500">{row.name}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-100">
                  {row.last != null ? displayPx(row.last, row.currency, locale, usdTwd) : '—'}
                </p>
                <p className="text-xs">
                  {row.changePct != null ? <Delta value={row.changePct} /> : '—'}
                </p>
              </td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]', turnClass(row.turn))}>
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
              {hideInst ? null : (
                <td className="px-4 py-3">
                  {row.market === 'us' ? (
                    <p className="text-[11px] text-zinc-600">{tPeakpro(locale, 'tapeNoInst')}</p>
                  ) : row.inst ? (
                    <>
                      <p>
                        <Delta value={row.inst.totalNet}>{formatZhang(row.inst.totalNet)}</Delta>
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function PeakProTapeDesk({ locale }: { locale: Locale }) {
  const { usdTwd, desk: region } = usePeakPro();
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

  const rows = (desk?.rows ?? []).filter((row) => region !== 'us' || row.market === 'us');
  const book = rows.filter((row) => row.inBook);
  const rest = rows.filter((row) => !row.inBook);
  const hideInst = region === 'us';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">{tPeakpro(locale, 'tapeTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          {tPeakproDesk(locale, region, 'tapeLead')}
        </p>
      </div>

      {setup ? (
        <Notice>{tPeakpro(locale, 'tapeSetup')}</Notice>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">{tPeakpro(locale, 'tapeLoading')}</p>
      ) : error ? (
        <p className="peakpro-panel px-6 py-12 text-center text-sm text-zinc-500">{error}</p>
      ) : !desk || desk.rows.every((row) => row.prints === 0 && !row.inst) ? (
        <p className="peakpro-panel px-6 py-12 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'tapeEmpty')}
        </p>
      ) : (
        <>
          <div className={hideInst ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-3'}>
            {hideInst ? null : (
              <article className="peakpro-panel px-5 py-5">
                <p className="peakpro-kicker">{tPeakpro(locale, 'tapeTaiwan')}</p>
                <p className="mt-3 font-mono text-2xl text-ice">
                  {desk.summary.twLead} {tPeakpro(locale, 'tapeLeadCount')}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {desk.summary.twLag} {tPeakpro(locale, 'tapeLagCount')}
                  {desk.benches.taiwan.changePct != null
                    ? ` · 0050 ${formatPct(desk.benches.taiwan.changePct)}`
                    : ''}
                </p>
              </article>
            )}
            <article className="peakpro-panel px-5 py-5">
              <p className="peakpro-kicker">{tPeakpro(locale, 'tapeUs')}</p>
              <p className="mt-3 font-mono text-2xl text-ice">
                {desk.summary.usLead} {tPeakpro(locale, 'tapeLeadCount')}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {desk.summary.usLag} {tPeakpro(locale, 'tapeLagCount')}
                {desk.benches.us.changePct != null ? ` · QQQ ${formatPct(desk.benches.us.changePct)}` : ''}
              </p>
            </article>
            <article className="peakpro-panel px-5 py-5">
              <p className="peakpro-kicker">{tPeakpro(locale, 'tapeBookPulse')}</p>
              <p className="mt-3 font-mono text-2xl text-signal">
                {desk.summary.bookThrust} {tPeakpro(locale, 'tape_thrust')}
              </p>
              <p className="mt-1 text-sm text-plasma">
                {desk.summary.bookPress} {tPeakpro(locale, 'tape_press')}
              </p>
              {!hideInst && desk.instDate ? (
                <p className="mt-2 text-[11px] text-zinc-600">
                  {tPeakpro(locale, 'tapeInstDate')} {desk.instDate}
                </p>
              ) : null}
            </article>
          </div>

          {book.length > 0 ? (
            <section className="space-y-3">
              <h3 className="peakpro-kicker">{tPeakpro(locale, 'tapeBook')}</h3>
              <TapeTable locale={locale} rows={book} usdTwd={usdTwd} hideInst={hideInst} />
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="peakpro-kicker">{tPeakpro(locale, 'tapeDesk')}</h3>
            {rest.length === 0 ? (
              <p className="peakpro-panel px-6 py-10 text-center text-sm text-zinc-500">
                {tPeakpro(locale, 'tapeEmpty')}
              </p>
            ) : (
              <TapeTable locale={locale} rows={rest} usdTwd={usdTwd} hideInst={hideInst} />
            )}
          </section>
        </>
      )}

      {tPeakpro(locale, 'tapeFoot') ? (
        <p className="text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'tapeFoot')}</p>
      ) : null}
    </div>
  );
}
