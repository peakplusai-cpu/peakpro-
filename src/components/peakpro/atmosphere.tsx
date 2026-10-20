const BANDS = [
  { top: '8%', width: '42%', delay: '0s', opacity: 0.9 },
  { top: '14%', width: '28%', delay: '-2s', opacity: 0.45 },
  { top: '21%', width: '61%', delay: '-4s', opacity: 0.7 },
  { top: '29%', width: '19%', delay: '-1s', opacity: 0.35 },
  { top: '36%', width: '73%', delay: '-6s', opacity: 0.55 },
  { top: '44%', width: '33%', delay: '-3s', opacity: 0.8 },
  { top: '52%', width: '51%', delay: '-7s', opacity: 0.4 },
  { top: '59%', width: '22%', delay: '-5s', opacity: 0.65 },
  { top: '67%', width: '68%', delay: '-8s', opacity: 0.5 },
  { top: '75%', width: '37%', delay: '-2.5s', opacity: 0.75 },
  { top: '83%', width: '14%', delay: '-9s', opacity: 0.3 },
  { top: '90%', width: '46%', delay: '-1.5s', opacity: 0.58 },
];

export function PeakProAtmosphere() {
  return (
    <>
      <div className="peakpro-spine" aria-hidden />
      <div className="peakpro-depth" aria-hidden>
        {BANDS.map((band) => (
          <span
            key={band.top}
            style={{
              top: band.top,
              width: band.width,
              opacity: band.opacity,
              animationDelay: band.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}
