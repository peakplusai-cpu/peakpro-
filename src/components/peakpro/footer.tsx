import type { Locale } from '@/i18n/locale';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-20 border-t border-gold/15 bg-black px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-6 text-xs leading-relaxed text-zinc-500">
        <p className="font-peakpro text-sm tracking-[0.28em] text-gold">{tPeakpro(locale, 'footerProduct')}</p>
        <p>{PEAKPRO_DISCLAIMER_EN}</p>
        <p>{PEAKPRO_DISCLAIMER_ZH}</p>
      </div>
    </footer>
  );
}
