import { deltaArrow, deltaClass, deltaTone, formatPct } from '@/lib/peakpro/format';
import { cn } from '@/lib/utils';

/** Signed move with an arrow so direction never depends on color alone. */
export function Delta({
  value,
  children,
  className,
}: {
  value: number | null | undefined;
  children?: React.ReactNode;
  className?: string;
}) {
  const tone = deltaTone(value);
  return (
    <span className={cn('inline-flex items-baseline gap-1 tabular-nums', deltaClass(tone), className)}>
      <span aria-hidden className="text-[0.62em] leading-none">
        {deltaArrow(tone)}
      </span>
      {children ?? (value == null ? '—' : formatPct(value))}
    </span>
  );
}
