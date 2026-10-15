import Link from 'next/link';
import { Lock } from 'lucide-react';

import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProPaywall({
  locale,
  blurred = true,
  children,
  body,
}: {
  locale: Locale;
  blurred?: boolean;
  children?: ReactNode;
  body?: string;
}) {
  return (
    <div className="peakpro-panel relative overflow-hidden">
      {blurred && children ? (
        <div className="pointer-events-none select-none blur-md opacity-40">{children}</div>
      ) : (
        <div className="h-64 bg-[radial-gradient(circle_at_top,_rgb(94_234_212_/_0.14),_transparent_55%)]" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-ink/55 p-6">
        <div className="peakpro-frame max-w-md bg-ink/85 px-6 py-8 text-center">
          <Lock className="mx-auto h-6 w-6 text-phosphor" />
          <h3 className="mt-4 font-peakpro text-2xl tracking-tight text-zinc-50">{tPeakpro(locale, 'lockedTitle')}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body ?? tPeakpro(locale, 'lockedBody')}</p>
          <Link href="/subscribe" className="peakpro-btn mt-6">
            {tPeakpro(locale, 'lockedCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
