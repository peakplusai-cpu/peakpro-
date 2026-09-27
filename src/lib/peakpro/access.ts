import {
  FREE_MONTHLY_SYMBOLS,
  type PeakProModule,
} from '@/lib/peakpro/constants';
import type { PeakProProfile, PeakProTier } from '@/lib/peakpro/types';

export function isPremiumActive(profile: Pick<PeakProProfile, 'tier' | 'expires_at'> | null): boolean {
  if (!profile || profile.tier !== 'premium') return false;
  if (!profile.expires_at) return true;
  return new Date(profile.expires_at).getTime() > Date.now();
}

export function effectiveTier(profile: Pick<PeakProProfile, 'tier' | 'expires_at'> | null): PeakProTier {
  return isPremiumActive(profile) ? 'premium' : 'free';
}

export function canAccessModule(tier: PeakProTier, moduleId: PeakProModule): boolean {
  if (tier === 'premium') return true;
  return moduleId === 'overview' || moduleId === 'us';
}

export function canAccessEquity(tier: PeakProTier, symbol: string, timeframe: string): boolean {
  if (tier === 'premium') return true;
  return (
    timeframe === 'monthly' &&
    (FREE_MONTHLY_SYMBOLS as readonly string[]).includes(symbol)
  );
}

export function premiumExpiresInDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
