'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import type { Locale } from '@/i18n/locale';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import {
  conceptAnchors,
  conceptDeskHref,
  findConceptAnchor,
  type ConceptAnchor,
  type ConceptSupplier,
} from '@/lib/peakpro/concepts';
import { cn } from '@/lib/utils';

function text(locale: Locale, value: { zh: string; en: string }) {
  return locale === 'zh' ? value.zh : value.en;
}

function SupplierRow({
  locale,
  row,
  desk = 'tw',
}: {
  locale: Locale;
  row: ConceptSupplier;
  desk?: DeskRegion;
}) {
  const href = desk === 'us' && row.market === 'taiwan' ? null : conceptDeskHref(row);
  const body = (
    <>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ice-dim">{row.symbol}</p>
        <p className="mt-1 text-sm text-ice">{text(locale, row.name)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="peakpro-chip">
          {text(locale, row.supply)}
        </span>
        {href ? <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600" /> : null}
      </div>
    </>
  );

  const className =
    'flex items-center justify-between gap-4 peakpro-panel px-5 py-4';

  if (href) {
    return (
      <Link href={href} className={cn(className, '')}>
        {body}
      </Link>
    );
  }
  return <article className={className}>{body}</article>;
}

function AnchorCard({
  locale,
  row,
  onOpen,
}: {
  locale: Locale;
  row: ConceptAnchor;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      className="peakpro-panel px-5 py-5 text-left"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal/80">{row.symbol}</p>
      <h3 className="mt-2 font-peakpro text-xl font-semibold text-ice">{text(locale, row.name)}</h3>
      <p className="mt-2 text-xs text-zinc-500">{text(locale, row.sector)}</p>
      <p className="mt-4 text-[11px] tracking-wide text-zinc-400">
        {tPeakpro(locale, 'conceptsCount').replace('{n}', String(row.suppliers.length))}
      </p>
    </button>
  );
}

export function PeakProConceptsDesk({ locale, desk = 'tw' }: { locale: Locale; desk?: DeskRegion }) {
  const [tab, setTab] = useState<'taiwan' | 'us'>(desk === 'us' ? 'us' : 'taiwan');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = conceptAnchors(tab).map((row) =>
    desk === 'us'
      ? { ...row, suppliers: row.suppliers.filter((item) => item.market !== 'taiwan') }
      : row,
  );
  const open = openId ? findConceptAnchor(openId) : null;

  if (open) {
    const deskHref = conceptDeskHref(open);
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setTab(open.market);
            setOpenId(null);
          }}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-signal"
        >
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'conceptsBack')}
        </button>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal/80">{open.symbol}</p>
            <h2 className="mt-2 font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">{text(locale, open.name)}</h2>
            <p className="mt-2 text-sm text-zinc-500">{text(locale, open.sector)}</p>
          </div>
          {deskHref && !(desk === 'us' && open.market === 'taiwan') ? (
            <Link href={deskHref} className="font-mono text-xs uppercase tracking-[0.16em] text-signal hover:underline">
              {tPeakpro(locale, 'conceptsOpenTape')}
            </Link>
          ) : null}
        </header>
        <p className="peakpro-kicker">{tPeakpro(locale, 'conceptsChain')}</p>
        <div className="space-y-3">
          {open.suppliers
            .filter((row) => desk !== 'us' || row.market !== 'taiwan')
            .map((row) => (
            <SupplierRow
              key={`${open.id}-${row.symbol}-${row.supply.en}`}
              locale={locale}
              row={row}
              desk={desk}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">{tPeakpro(locale, 'conceptsTitle')}</h2>
        {tPeakpro(locale, 'conceptsLead') ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'conceptsLead')}</p>
        ) : null}
      </div>

      {desk === 'us' ? null : (
        <div className="flex flex-wrap gap-2">
          {(['taiwan', 'us'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
                tab === id ? 'bg-signal text-void' : 'border border-signal/25 text-zinc-400 hover:text-signal',
              )}
            >
              {tPeakpro(locale, id === 'taiwan' ? 'conceptsTaiwan' : 'conceptsUs')}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <AnchorCard key={row.id} locale={locale} row={row} onOpen={setOpenId} />
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-600">
        {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
      </p>
    </div>
  );
}
