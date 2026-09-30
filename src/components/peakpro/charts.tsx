import type { Locale } from '@/i18n/locale';
import type { OhlcBar, SentimentGauge } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function SparkCandles({
  bars,
  className,
  width = 320,
  height = 120,
}: {
  bars: OhlcBar[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (bars.length === 0) return null;
  const visible = height > 200 ? bars : bars.length > 48 ? bars.slice(-48) : bars;
  const min = Math.min(...visible.map((b) => b.l));
  const max = Math.max(...visible.map((b) => b.h));
  const span = Math.max(max - min, 1);
  const padTop = 8;
  const padBottom = height > 200 ? 22 : 8;
  const innerH = height - padTop - padBottom;
  const candleW = Math.max(2, width / visible.length - 1.4);
  const y = (v: number) => ((max - v) / span) * innerH + padTop;
  const labelIdx = [0, Math.floor((visible.length - 1) / 2), visible.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-28 w-full', className)}>
      {visible.map((bar, index) => {
        const x = (index / visible.length) * width;
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
      {height > 200
        ? labelIdx.map((index) => (
            <text
              key={`label-${index}`}
              x={(index / visible.length) * width + candleW / 2}
              y={height - 6}
              textAnchor={index === 0 ? 'start' : index === visible.length - 1 ? 'end' : 'middle'}
              fill="#71717a"
              fontSize="10"
            >
              {visible[index]?.t}
            </text>
          ))
        : null}
    </svg>
  );
}

export function FearGreedGauge({
  data,
  locale,
  compact = false,
}: {
  data: Pick<SentimentGauge, 'value' | 'classification' | 'classificationZh'>;
  locale?: Locale;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, data.value));
  const angle = Math.PI * (1 - clamped / 100);
  const x = 100 + Math.cos(angle) * 72;
  const y = 100 - Math.sin(angle) * 72;
  const label = locale === 'zh' ? data.classificationZh : data.classification;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className={cn('w-full max-w-sm', compact ? 'h-28' : 'h-40')}>
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
      <p className={cn('font-peakpro text-gold', compact ? 'text-3xl' : 'text-4xl')}>{clamped}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-zinc-400">{label}</p>
    </div>
  );
}
