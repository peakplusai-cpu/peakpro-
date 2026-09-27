'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PeakProModule } from '@/lib/peakpro/constants';
import type { PeakProSession, PeakProTier } from '@/lib/peakpro/types';

type PeakProContextValue = PeakProSession & {
  activeModule: PeakProModule;
  setActiveModule: (moduleId: PeakProModule) => void;
  isPremium: boolean;
};

const PeakProContext = createContext<PeakProContextValue | null>(null);

export function PeakProProvider({
  session,
  activeModule: initialModule,
  children,
}: {
  session: PeakProSession;
  activeModule: PeakProModule;
  children: ReactNode;
}) {
  const [activeModule, setActiveModule] = useState<PeakProModule>(initialModule);

  const value = useMemo<PeakProContextValue>(
    () => ({
      ...session,
      activeModule,
      setActiveModule,
      isPremium: session.tier === 'premium',
    }),
    [session, activeModule],
  );

  return <PeakProContext.Provider value={value}>{children}</PeakProContext.Provider>;
}

export function usePeakPro(): PeakProContextValue {
  const ctx = useContext(PeakProContext);
  if (!ctx) {
    return {
      userId: null,
      email: null,
      tier: 'free' satisfies PeakProTier,
      expiresAt: null,
      revoked: false,
      activeModule: 'overview',
      setActiveModule: () => undefined,
      isPremium: false,
    };
  }
  return ctx;
}
