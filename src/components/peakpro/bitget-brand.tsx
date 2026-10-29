import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { cn } from '@/lib/utils';

export const BITGET_HREF = 'https://www.bitget.com';

/** Official Bitget mark from https://www.bitget.com/baseasset/img/v3-home/logo-simple2.svg */
export function BitgetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 49 48"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden
    >
      <rect x="2.5" y="2" width="44" height="44" rx="8.92288" fill="#00F0FF" stroke="white" strokeWidth="4" />
      <path
        d="M22.9578 19.7659H30.4264L38.0668 27.3575C38.5639 27.8513 38.5664 28.6546 38.0719 29.151L28.2735 38.9988H20.5798L22.9058 36.7375L31.4458 28.2514L23.0142 19.7653"
        fill="#1B1B1B"
      />
      <path
        d="M26.0291 28.2332H18.5604L10.92 20.6416C10.423 20.1477 10.4205 19.3445 10.9149 18.8481L20.7133 8.99963H28.407L26.081 11.2609L17.541 19.7471L25.9726 28.2332"
        fill="#1B1B1B"
      />
    </svg>
  );
}

export function BitgetAuthorizedLockup({
  locale,
  size = 'hero',
}: {
  locale: Locale;
  size?: 'hero' | 'desk';
}) {
  const hero = size === 'hero';
  return (
    <a
      href={BITGET_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tPeakpro(locale, 'bitgetAuthorized')}
      className={cn(
        'inline-flex items-center gap-3 text-ice-dim transition-colors hover:text-ice',
        hero ? 'max-w-xl flex-wrap' : 'gap-2',
      )}
    >
      <BitgetMark className={hero ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-7 w-7'} />
      <span
        className={cn(
          hero
            ? 'text-lg leading-relaxed sm:text-xl'
            : 'font-mono text-[11px] uppercase tracking-[0.16em]',
        )}
      >
        {tPeakpro(locale, 'bitgetAuthorized')}
      </span>
    </a>
  );
}
