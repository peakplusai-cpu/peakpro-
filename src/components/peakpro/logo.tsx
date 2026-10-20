import { useId } from 'react';

import { cn } from '@/lib/utils';

export function PeakMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b794ff" />
          <stop offset="100%" stopColor="#4df0ff" />
        </linearGradient>
      </defs>
      <path d="M2 27 L13 7 L18 16 L22 10 L30 27 Z" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.8" strokeLinejoin="miter" />
      <path d="M8 27 L13 18 L16 23" fill="none" stroke="#4df0ff" strokeWidth="1" opacity="0.55" />
      <rect x="11.2" y="5.2" width="3.6" height="3.6" fill="#4df0ff" />
    </svg>
  );
}

export function PeakProLogo({
  className,
  size = 'md',
  align = 'center',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'xl';
  align?: 'center' | 'left';
}) {
  if (size === 'xl') {
    return (
      <div className={cn('select-none', align === 'left' ? 'text-left' : 'text-center', className)}>
        <h1
          data-text="PEAKPRO+"
          className="peakpro-glitch peakpro-glitch-auto font-peakpro text-[13.5vw] font-bold uppercase leading-[0.86] tracking-[-0.01em] text-ice sm:text-[6.6rem] lg:text-[7.4rem]"
        >
          Peak<span className="peakpro-gradient-text">Pro</span>
          <span className="text-signal">+</span>
        </h1>
      </div>
    );
  }

  const text = size === 'sm' ? 'text-lg' : 'text-3xl';
  return (
    <div
      className={cn(
        'flex select-none items-center gap-2.5',
        align === 'left' ? 'justify-start' : 'justify-center',
        className,
      )}
    >
      <PeakMark className={size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'} />
      <p
        data-text="PEAKPRO+"
        className={cn('peakpro-glitch font-peakpro font-bold uppercase tracking-[0.04em] text-ice', text)}
      >
        Peak<span className="text-signal">Pro</span>+
      </p>
    </div>
  );
}
