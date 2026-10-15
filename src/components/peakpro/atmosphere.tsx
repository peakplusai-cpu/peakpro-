'use client';

import { useEffect } from 'react';

export function PeakProAtmosphere() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
      document.documentElement.style.setProperty('--my', `${event.clientY}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <>
      <div className="peakpro-grid" aria-hidden />
      <div className="peakpro-spot" aria-hidden />
      <div className="peakpro-grain" aria-hidden />
    </>
  );
}
