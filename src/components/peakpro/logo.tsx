import { cn } from '@/lib/utils';

export function PeakProLogo({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'xl';
}) {
  const scale =
    size === 'xl' ? 'text-6xl sm:text-8xl md:text-9xl' : size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <div className={cn('select-none text-center', className)}>
      <p
        className={cn(
          'font-peakpro font-semibold text-[#D4AF37]',
          size === 'xl' ? 'tracking-[0.06em]' : 'tracking-[0.12em]',
          scale,
        )}
      >
        PeakPro+
      </p>
      {size === 'xl' ? (
        <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-[#C5A059]">
          Market Intelligence
        </p>
      ) : null}
    </div>
  );
}
