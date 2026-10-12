'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PeakProModule } from '@/lib/peakpro/constants';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import type { PeakProSession, PeakProTier } from '@/lib/peakpro/types';

type PeakProContextValue = PeakProSession & {
  activeModule: PeakProModule;
  setActiveModule: (moduleId: PeakProModule) => void;
  isPremium: boolean;
  usdTwd: number | null;
  desk: DeskRegion;
};

const PeakProContext = createContext<PeakProContextValue | null>(null);

export function PeakProProvider({
  session,
  activeModule: initialModule,
  usdTwd = null,
  desk = 'tw',
  children,
}: {
  session: PeakProSession;
  activeModule: PeakProModule;
  usdTwd?: number | null;
  desk?: DeskRegion;
  children: ReactNode;
}) {
  const [activeModule, setActiveModule] = useState<PeakProModule>(initialModule);

  const value = useMemo<PeakProContextValue>(
    () => ({
      ...session,
      activeModule,
      setActiveModule,
      isPremium: session.tier === 'premium',
      usdTwd,
      desk,
    }),
    [session, activeModule, usdTwd, desk],
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
      trial: false,
      customerId: null,
      subscriptionId: null,
      activeModule: 'overview',
      setActiveModule: () => undefined,
      isPremium: false,
      usdTwd: null,
      desk: 'tw',
    };
  }
  return ctx;
}
