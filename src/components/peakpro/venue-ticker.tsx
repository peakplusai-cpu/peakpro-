'use client';

const VENUES = [
  'NYSE',
  'NASDAQ',
  'CME',
  'TWSE',
  'TPEX',
  'HKEX',
  'TSE',
  'LSE',
  'XETRA',
  'B3',
  'TSX',
  'NSE',
];

export function PeakProVenueTicker() {
  const loop = [...VENUES, ...VENUES];
  return (
    <div className="relative overflow-hidden border-y border-phosphor/15 bg-ink-panel/80">
      <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent" />
      <div className="flex w-max animate-[peakproTape_28s_linear_infinite] gap-10 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-phosphor/80">
        {loop.map((venue, index) => (
          <span key={`${venue}-${index}`} className="flex items-center gap-3">
            <span className="h-px w-6 bg-gold/50" />
            {venue}
          </span>
        ))}
      </div>
    </div>
  );
}
