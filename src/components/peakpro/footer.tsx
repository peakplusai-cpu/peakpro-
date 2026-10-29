import type { Locale } from '@/i18n/locale';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-20 border-t border-signal/15 bg-void/70 px-5 py-12 backdrop-blur-sm lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6 text-xs leading-relaxed text-zinc-500">
        <p className="peakpro-kicker">{tPeakpro(locale, 'footerProduct')}</p>
        <p>{PEAKPRO_DISCLAIMER_EN}</p>
        <p>{PEAKPRO_DISCLAIMER_ZH}</p>
      </div>
    </footer>
  );
}
