const PERIOD = 6;

/** Venue radar: each blip pings when the sweep crosses its bearing. Purely decorative. */
const BLIPS = [
  { code: 'TWSE', angle: 38, r: 0.58 },
  { code: 'NYSE', angle: 112, r: 0.8 },
  { code: 'NASDAQ', angle: 154, r: 0.46 },
  { code: 'LSE', angle: 214, r: 0.72 },
  { code: 'XETRA', angle: 252, r: 0.4 },
  { code: 'TSE', angle: 296, r: 0.66 },
  { code: 'HKEX', angle: 334, r: 0.84 },
] as const;

function polar(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: 200 + Math.cos(rad) * radius * 170, y: 200 + Math.sin(rad) * radius * 170 };
}

export function VenueRadar({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        <div className="peakpro-radar-sweep" />
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle key={f} cx="200" cy="200" r={170 * f} fill="none" stroke="rgba(77,240,255,0.2)" strokeWidth="1" />
          ))}
          <circle cx="200" cy="200" r="186" fill="none" stroke="rgba(183,148,255,0.35)" strokeWidth="1" strokeDasharray="2 8" />
          <line x1="30" y1="200" x2="370" y2="200" stroke="rgba(77,240,255,0.16)" />
          <line x1="200" y1="30" x2="200" y2="370" stroke="rgba(77,240,255,0.16)" />
          <line x1="80" y1="80" x2="320" y2="320" stroke="rgba(77,240,255,0.08)" />
          <line x1="320" y1="80" x2="80" y2="320" stroke="rgba(77,240,255,0.08)" />
          {Array.from({ length: 72 }, (_, i) => {
            const a = polar(i * 5, 1.07);
            const b = polar(i * 5, i % 6 === 0 ? 1.0 : 1.035);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(77,240,255,0.4)" strokeWidth="1" />;
          })}
          <circle cx="200" cy="200" r="3" fill="#4df0ff" />
          {BLIPS.map((blip) => {
            const p = polar(blip.angle, blip.r);
            const delay = (blip.angle / 360) * PERIOD;
            return (
              <g key={blip.code}>
                <circle
                  className="peakpro-blip"
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#4df0ff"
                  style={{ animationDelay: `${delay}s` }}
                />
                <text
                  x={p.x + 9}
                  y={p.y + 3.5}
                  fill="#9db4c6"
                  fontSize="10"
                  letterSpacing="1.5"
                  fontFamily="var(--font-peakpro-mono), monospace"
                >
                  {blip.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
