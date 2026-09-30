'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { anonymousGrowthBars } from '@/lib/peakpro/seed-data';

const INTRO_KEY = 'peakpro-intro-seen-v3';

export function IntroCandles({
  locale,
  onComplete,
}: {
  locale: Locale;
  onComplete: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const bars = useMemo(() => anonymousGrowthBars(36), []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(INTRO_KEY) === '1') {
        onComplete();
        return;
      }
    } catch {
      onComplete();
      return;
    }

    setVisible(true);
    const done = window.setTimeout(() => {
      try {
        window.localStorage.setItem(INTRO_KEY, '1');
      } catch {
        // ignore quota
      }
      setVisible(false);
      onComplete();
    }, 900);
    return () => window.clearTimeout(done);
  }, [onComplete]);

  const min = Math.min(...bars.map((b) => b.l));
  const max = Math.max(...bars.map((b) => b.h));
  const span = Math.max(max - min, 1);
  const width = 720;
  const height = 320;
  const step = width / bars.length;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="mb-10 text-xs tracking-[0.28em] text-[#D4AF37]">
            {tPeakpro(locale, 'introKicker')}
          </p>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[40vh] w-[min(92vw,880px)]"
            role="img"
            aria-label="Anonymous hyper-growth candlestick tape"
          >
            {bars.map((bar, index) => {
              const x = index * step + 3;
              const y = (v: number) => ((max - v) / span) * (height - 20) + 10;
              const bodyH = Math.max(8, Math.abs(y(bar.c) - y(bar.o)));
              return (
                <g key={`${bar.t}-${index}`}>
                  <line
                    x1={x + 6}
                    x2={x + 6}
                    y1={y(bar.h)}
                    y2={y(bar.l)}
                    stroke="#F0C040"
                    strokeWidth="2"
                  />
                  <rect
                    x={x}
                    y={Math.min(y(bar.o), y(bar.c))}
                    width="12"
                    height={bodyH}
                    fill="#D4AF37"
                  />
                </g>
              );
            })}
          </svg>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
