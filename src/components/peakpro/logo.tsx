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
    size === 'xl'
      ? 'text-[18vw] leading-[0.82] sm:text-[8.5rem] md:text-[10rem]'
      : size === 'sm'
        ? 'text-xl'
        : 'text-3xl';

  return (
    <div className={cn('select-none', align === 'left' ? 'text-left' : 'text-center', className)}>
      <p className={cn('font-peakpro font-normal tracking-tight text-gold', scale)}>
        Peak
        <span className="italic">Pro</span>
        <span className="text-phosphor">+</span>
      </p>
    </div>
  );
}
