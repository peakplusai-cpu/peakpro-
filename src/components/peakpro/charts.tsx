import type { FearGreedPayload, OhlcBar } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function SparkCandles({ bars, className }: { bars: OhlcBar[]; className?: string }) {
  if (bars.length === 0) return null;
  const min = Math.min(...bars.map((b) => b.l));
  const max = Math.max(...bars.map((b) => b.h));
  const span = Math.max(max - min, 1);
  const width = 320;
  const height = 120;
  const candleW = Math.max(2, width / bars.length - 1.4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-28 w-full', className)}>
      {bars.map((bar, index) => {
        const x = (index / bars.length) * width;
        const y = (v: number) => ((max - v) / span) * (height - 8) + 4;
        const up = bar.c >= bar.o;
        return (
          <g key={`${bar.t}-${index}`}>
            <line
              x1={x + candleW / 2}
              x2={x + candleW / 2}
              y1={y(bar.h)}
              y2={y(bar.l)}
              stroke={up ? '#D4AF37' : '#6b5420'}
              strokeWidth="1"
            />
            <rect
              x={x}
              y={Math.min(y(bar.o), y(bar.c))}
              width={candleW}
              height={Math.max(1.5, Math.abs(y(bar.c) - y(bar.o)))}
              fill={up ? '#D4AF37' : '#14110a'}
              stroke="#D4AF37"
              strokeWidth="0.6"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function FearGreedGauge({ data }: { data: FearGreedPayload }) {
  const clamped = Math.max(0, Math.min(100, data.value));
  const angle = Math.PI * (1 - clamped / 100);
  const x = 100 + Math.cos(angle) * 72;
  const y = 100 - Math.sin(angle) * 72;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="h-40 w-full max-w-sm">
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="#2a2312"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 251} 251`}
        />
        <line x1="100" y1="100" x2={x} y2={y} stroke="#f8e7b0" strokeWidth="3" />
        <circle cx="100" cy="100" r="5" fill="#D4AF37" />
      </svg>
      <p className="font-peakpro text-4xl text-gold">{clamped}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-zinc-400">{data.classification}</p>
    </div>
  );
}
