import { useId } from 'react';

import type { Locale } from '@/i18n/locale';
import { PALETTE } from '@/lib/peakpro/palette';
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
  const gradientId = useId();
  if (bars.length < 2) return null;
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
  const last = visible[visible.length - 1];
  const lastY = y(last.c);
  const gridLines = [0.25, 0.5, 0.75].map((f) => padTop + innerH * f);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-28 w-full', className)}
      style={{ filter: 'drop-shadow(0 0 8px rgba(77,240,255,0.18))' }}
    >
      <defs>
        <linearGradient id={`${gradientId}-down`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.plasma} stopOpacity="0.5" />
          <stop offset="100%" stopColor={PALETTE.plasma} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {gridLines.map((gy) => (
        <line key={gy} x1="0" x2={width} y1={gy} y2={gy} stroke={PALETTE.grid} strokeWidth="1" strokeDasharray="2 5" />
      ))}
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
              stroke={up ? PALETTE.signal : PALETTE.plasma}
              strokeWidth="1"
              opacity="0.8"
            />
            <rect
              x={x}
              y={Math.min(y(bar.o), y(bar.c))}
              width={candleW}
              height={Math.max(1.5, Math.abs(y(bar.c) - y(bar.o)))}
              fill={up ? PALETTE.signal : `url(#${gradientId}-down)`}
              fillOpacity={up ? 0.88 : 1}
              stroke={up ? PALETTE.signal : PALETTE.plasma}
              strokeWidth="0.6"
            />
          </g>
        );
      })}
      <line x1="0" x2={width} y1={lastY} y2={lastY} stroke={PALETTE.signal} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.55" />
      <circle cx={width - 2} cy={lastY} r="2.6" fill={PALETTE.signal} />
      {height > 200
        ? labelIdx.map((index) => (
            <text
              key={`label-${index}`}
              x={(index / visible.length) * width + candleW / 2}
              y={height - 6}
              textAnchor={index === 0 ? 'start' : index === visible.length - 1 ? 'end' : 'middle'}
              fill={PALETTE.muted}
              fontSize="10"
              fontFamily="var(--font-peakpro-mono), monospace"
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
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(100, data.value));
  const angle = Math.PI * (1 - clamped / 100);
  const x = 100 + Math.cos(angle) * 66;
  const y = 100 - Math.sin(angle) * 66;
  const label = locale === 'zh' ? data.classificationZh : data.classification;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (1 - i / 10);
    return {
      key: i,
      x1: 100 + Math.cos(a) * 88,
      y1: 100 - Math.sin(a) * 88,
      x2: 100 + Math.cos(a) * (i % 5 === 0 ? 96 : 92),
      y2: 100 - Math.sin(a) * (i % 5 === 0 ? 96 : 92),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 120"
        className={cn('w-full max-w-sm', compact ? 'h-28' : 'h-40')}
        style={{ filter: 'drop-shadow(0 0 10px rgba(77,240,255,0.22))' }}
      >
        <defs>
          <linearGradient id={`${gradientId}-g`} x1="20" y1="100" x2="180" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={PALETTE.plasma} />
            <stop offset="100%" stopColor={PALETTE.signal} />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <line key={tick.key} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke={PALETTE.muted} strokeWidth="1" />
        ))}
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#12203a" strokeWidth="10" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={`url(#${gradientId}-g)`}
          strokeWidth="10"
          strokeDasharray={`${(clamped / 100) * 251} 251`}
        />
        <line x1="100" y1="100" x2={x} y2={y} stroke={PALETTE.ice} strokeWidth="2" />
        <circle cx="100" cy="100" r="5" fill={PALETTE.void} stroke={PALETTE.signal} strokeWidth="2" />
      </svg>
      <p className={cn('font-mono tabular-nums text-signal peakpro-glow', compact ? 'text-3xl' : 'text-4xl')}>{clamped}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400">{label}</p>
    </div>
  );
}
