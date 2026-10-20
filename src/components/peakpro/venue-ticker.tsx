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
    <div className="relative overflow-hidden border-y border-white/10 bg-phosphor">
      <div className="flex w-max animate-[peakproTape_28s_linear_infinite] gap-10 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-white">
        {loop.map((venue, index) => (
          <span key={`${venue}-${index}`} className="flex items-center gap-3">
            <span className="h-px w-6 bg-white/70" />
            {venue}
          </span>
        ))}
      </div>
    </div>
  );
}
