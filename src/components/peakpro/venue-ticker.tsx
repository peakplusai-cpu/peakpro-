'use client';

const VENUES = ['NYSE', 'NASDAQ', 'CME', 'TWSE', 'TPEX', 'HKEX', 'TSE', 'LSE', 'XETRA', 'B3', 'TSX', 'NSE'];

export function PeakProVenueTicker() {
  const loop = [...VENUES, ...VENUES];
  return (
    <div
      className="relative overflow-hidden border-y border-signal/20 bg-void-panel/70"
      style={{
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <div className="flex w-max animate-[peakproTape_32s_linear_infinite] gap-12 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ice-dim">
        {loop.map((venue, index) => (
          <span key={`${venue}-${index}`} className="flex items-center gap-4">
            <span className="h-1.5 w-1.5 rotate-45 bg-signal shadow-[0_0_8px_rgba(77,240,255,0.9)]" />
            {venue}
          </span>
        ))}
      </div>
    </div>
  );
}
