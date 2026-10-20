'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { PeakMark } from '@/components/peakpro/logo';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

const INTRO_KEY = 'peakpro-intro-seen-v7';
const LINES = ['bootLine1', 'bootLine2', 'bootLine3'] as const;

/** One-time boot sequence: typed status lines, progress bar, then the desk fades in. */
export function IntroBoot({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(INTRO_KEY) === '1') return;
    } catch {
      return;
    }

    setVisible(true);
    const timers = LINES.map((_, index) => window.setTimeout(() => setShown(index + 1), 380 + index * 620));
    const done = window.setTimeout(() => {
      try {
        window.localStorage.setItem(INTRO_KEY, '1');
      } catch {
        // storage unavailable
      }
      setVisible(false);
    }, 2700);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(done);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-void px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <PeakMark className="h-24 w-24 drop-shadow-[0_0_28px_rgba(77,240,255,0.55)]" />
          </motion.div>
          <ul className="mt-10 w-full max-w-sm space-y-2 font-mono text-xs uppercase tracking-[0.2em]">
            {LINES.map((key, index) => (
              <li
                key={key}
                className={index < shown ? 'flex items-center gap-3 text-signal' : 'flex items-center gap-3 text-transparent'}
              >
                <span aria-hidden>{index < shown - 1 || shown === LINES.length ? '■' : '▶'}</span>
                {tPeakpro(locale, key)}
              </li>
            ))}
          </ul>
          <div className="mt-8 h-px w-full max-w-sm overflow-hidden bg-signal/15">
            <motion.div
              className="h-full bg-signal shadow-[0_0_14px_rgba(77,240,255,0.9)]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.3, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
