import type { PeakProModule } from '@/lib/peakpro/constants';
import type { PeakProProfile, PeakProTier } from '@/lib/peakpro/types';

export function isPremiumActive(profile: Pick<PeakProProfile, 'tier' | 'expires_at'> | null): boolean {
  if (!profile || profile.tier !== 'premium') return false;
  if (!profile.expires_at) return false;
  return new Date(profile.expires_at).getTime() > Date.now();
}

export function isTrialGrant(
  profile: Pick<
    PeakProProfile,
    'tier' | 'expires_at' | 'creem_subscription_id' | 'creem_last_transaction_id'
  > | null,
): boolean {
  if (!isPremiumActive(profile) || !profile) return false;
  return !profile.creem_last_transaction_id;
}

export function effectiveTier(profile: Pick<PeakProProfile, 'tier' | 'expires_at'> | null): PeakProTier {
  return isPremiumActive(profile) ? 'premium' : 'free';
}

const PREMIUM_MODULES: PeakProModule[] = [
  'forecast',
  'geopolitics',
  'filings',
  'sentiment',
  'advisor',
];

export function canAccessModule(tier: PeakProTier, moduleId: PeakProModule): boolean {
  if (tier === 'premium') return true;
  return !PREMIUM_MODULES.includes(moduleId);
}

export function canAccessEquity(_tier: PeakProTier, _symbol: string, _timeframe: string): boolean {
  return true;
}

export function canOpenEquity(_tier: PeakProTier, _symbol: string): boolean {
  return true;
}

export function canIngestCustomEquity(tier: PeakProTier): boolean {
  return tier === 'premium';
}

export function premiumExpiresInDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
