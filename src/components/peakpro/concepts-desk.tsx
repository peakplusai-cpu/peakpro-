'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import type { Locale } from '@/i18n/locale';
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

function SupplierRow({ locale, row }: { locale: Locale; row: ConceptSupplier }) {
  const href = conceptDeskHref(row);
  const body = (
    <>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-antique">{row.symbol}</p>
        <p className="mt-1 text-sm text-white">{text(locale, row.name)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold">
          {text(locale, row.supply)}
        </span>
        {href ? <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600" /> : null}
      </div>
    </>
  );

  const className =
    'flex items-center justify-between gap-4 rounded-2xl border border-gold/15 bg-black/60 px-5 py-4';

  if (href) {
    return (
      <Link href={href} className={cn(className, 'hover:border-gold/40')}>
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
      className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5 text-left hover:border-gold/40"
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{row.symbol}</p>
      <h3 className="mt-2 font-peakpro text-xl text-gold">{text(locale, row.name)}</h3>
      <p className="mt-2 text-xs text-zinc-500">{text(locale, row.sector)}</p>
      <p className="mt-4 text-[11px] tracking-wide text-zinc-400">
        {tPeakpro(locale, 'conceptsCount').replace('{n}', String(row.suppliers.length))}
      </p>
    </button>
  );
}

export function PeakProConceptsDesk({ locale }: { locale: Locale }) {
  const [tab, setTab] = useState<'taiwan' | 'us'>('taiwan');
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = conceptAnchors(tab);
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
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'conceptsBack')}
        </button>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{open.symbol}</p>
            <h2 className="mt-2 font-peakpro text-3xl text-gold">{text(locale, open.name)}</h2>
            <p className="mt-2 text-sm text-zinc-500">{text(locale, open.sector)}</p>
          </div>
          {deskHref ? (
            <Link href={deskHref} className="text-sm text-gold hover:underline">
              {tPeakpro(locale, 'conceptsOpenTape')}
            </Link>
          ) : null}
        </header>
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{tPeakpro(locale, 'conceptsChain')}</p>
        <div className="space-y-3">
          {open.suppliers.map((row) => (
            <SupplierRow key={`${open.id}-${row.symbol}-${row.supply.en}`} locale={locale} row={row} />
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-600">
          {tPeakpro(locale, 'conceptsFoot')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'conceptsTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'conceptsLead')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['taiwan', 'us'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs tracking-wide',
              tab === id ? 'bg-gold text-black' : 'border border-gold/25 text-zinc-400 hover:text-gold',
            )}
          >
            {tPeakpro(locale, id === 'taiwan' ? 'conceptsTaiwan' : 'conceptsUs')}
          </button>
        ))}
      </div>

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
