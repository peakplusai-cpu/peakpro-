import { cn } from '@/lib/utils';

export function PeakProLogo({
  className,
  size = 'md',
  align = 'center',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'xl';
  align?: 'center' | 'left';
}) {
  const scale =
    size === 'xl' ? 'text-6xl sm:text-7xl md:text-8xl' : size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <div className={cn('select-none', align === 'left' ? 'text-left' : 'text-center', className)}>
      <p
        className={cn(
          'font-peakpro font-semibold leading-none tracking-tight',
          size === 'xl' ? 'tracking-[-0.04em]' : 'tracking-tight',
          scale,
        )}
      >
        <span className="text-zinc-50">Peak</span>
        <span className="peakpro-gold-text">Pro</span>
        <span className="text-phosphor">+</span>
      </p>
      {size === 'xl' ? (
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.42em] text-phosphor/80">
          Private terminal
        </p>
      ) : null}
    </div>
  );
}
