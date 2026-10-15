'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { anonymousGrowthBars } from '@/lib/peakpro/seed-data';

const INTRO_KEY = 'peakpro-intro-seen-v5';

export function IntroCandles({
  locale,
  onComplete,
}: {
  locale: Locale;
  onComplete: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const bars = useMemo(() => anonymousGrowthBars(42), []);

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
    }, 2400);
    return () => window.clearTimeout(done);
  }, [onComplete]);

  const min = Math.min(...bars.map((b) => b.l));
  const max = Math.max(...bars.map((b) => b.h));
  const span = Math.max(max - min, 1);
  const width = 880;
  const height = 340;
  const step = width / bars.length;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="peakpro-scan" />
          <p className="peakpro-kicker mb-10 animate-[peakproFlicker_2.4s_linear_infinite]">
            <span className="peakpro-live" />
            {tPeakpro(locale, 'introKicker')}
          </p>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[42vh] w-[min(94vw,920px)]"
            role="img"
            aria-label="Anonymous hyper-growth candlestick tape"
          >
            {bars.map((bar, index) => {
              const x = index * step + 2;
              const y = (v: number) => ((max - v) / span) * (height - 24) + 12;
              const up = bar.c >= bar.o;
              const bodyH = Math.max(6, Math.abs(y(bar.c) - y(bar.o)));
              const color = up ? '#5eead4' : '#e4c15a';
              return (
                <g
                  key={`${bar.t}-${index}`}
                  style={{
                    transformOrigin: `${x + 5}px ${y(bar.l)}px`,
                    animation: `peakproCandle 420ms cubic-bezier(.2,.8,.2,1) ${index * 28}ms both`,
                  }}
                >
                  <line
                    x1={x + 5}
                    x2={x + 5}
                    y1={y(bar.h)}
                    y2={y(bar.l)}
                    stroke={color}
                    strokeWidth="1.4"
                    opacity="0.85"
                  />
                  <rect
                    x={x}
                    y={Math.min(y(bar.o), y(bar.c))}
                    width="10"
                    height={bodyH}
                    fill={up ? '#5eead4' : '#14110a'}
                    stroke={color}
                    strokeWidth="0.8"
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
