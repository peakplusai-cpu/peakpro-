import Link from 'next/link';
import { Lock } from 'lucide-react';

import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProPaywall({
  locale,
  blurred = true,
  children,
}: {
  locale: Locale;
  blurred?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-zinc-950">
      {blurred && children ? (
        <div className="pointer-events-none select-none blur-md opacity-40">{children}</div>
      ) : (
        <div className="h-64 bg-[radial-gradient(circle_at_top,_rgb(212_175_55_/_0.12),_transparent_55%)]" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-6">
        <div className="max-w-md rounded-2xl border border-gold/30 bg-black/80 px-6 py-8 text-center peakpro-hairline">
          <Lock className="mx-auto h-6 w-6 text-gold" />
          <h3 className="mt-4 font-peakpro text-2xl text-gold">{tPeakpro(locale, 'lockedTitle')}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'lockedBody')}</p>
          <Link
            href="/subscribe"
            className="mt-6 inline-flex rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black"
          >
            {tPeakpro(locale, 'lockedCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
