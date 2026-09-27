import { effectiveTier } from '@/lib/peakpro/access';
import { peakproAdmin } from '@/lib/peakpro/db';
import type { PeakProProfile, PeakProSession } from '@/lib/peakpro/types';

const EMPTY: PeakProSession = {
  userId: null,
  email: null,
  tier: 'free',
  expiresAt: null,
  revoked: false,
};

export async function ensurePeakProProfile(
  userId: string,
  email: string | null,
): Promise<PeakProProfile | null> {
  try {
    const admin = peakproAdmin();
    const existing = await admin
      .from('peakpro_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing.data) {
      const profile = existing.data as PeakProProfile;
      if (profile.tier === 'premium' && !effectiveTier(profile)) {
        const downgraded = await admin
          .from('peakpro_profiles')
          .update({
            tier: 'free',
            revoked_at: new Date().toISOString(),
            revoke_reason: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select('*')
          .maybeSingle();
        return (downgraded.data as PeakProProfile | null) ?? { ...profile, tier: 'free' };
      }
      return profile;
    }

    const inserted = await admin
      .from('peakpro_profiles')
      .insert({
        id: userId,
        email,
        tier: 'free',
      })
      .select('*')
      .maybeSingle();

    return (inserted.data as PeakProProfile | null) ?? null;
  } catch (error) {
    console.warn('[peakpro/profile] warehouse unavailable', error);
    return null;
  }
}

export async function loadPeakProSession(
  userId: string | null,
  email: string | null,
): Promise<PeakProSession> {
  if (!userId) return EMPTY;
  const profile = await ensurePeakProProfile(userId, email);
  if (!profile) {
    return { userId, email, tier: 'free', expiresAt: null, revoked: false };
  }
  return {
    userId,
    email,
    tier: effectiveTier(profile),
    expiresAt: profile.expires_at,
    revoked: Boolean(profile.revoked_at) && effectiveTier(profile) === 'free',
  };
}

export async function activatePeakProPremium(input: {
  userId: string;
  email?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  transactionId?: string | null;
}): Promise<PeakProProfile | null> {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 30);
  const admin = peakproAdmin();
  const { data } = await admin
    .from('peakpro_profiles')
    .upsert(
      {
        id: input.userId,
        email: input.email ?? null,
        tier: 'premium',
        expires_at: expires.toISOString(),
        creem_customer_id: input.customerId ?? null,
        creem_subscription_id: input.subscriptionId ?? null,
        creem_last_transaction_id: input.transactionId ?? null,
        revoked_at: null,
        revoke_reason: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .maybeSingle();
  return (data as PeakProProfile | null) ?? null;
}

export async function revokePeakProPremium(input: {
  userId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  reason: string;
}): Promise<PeakProProfile | null> {
  const admin = peakproAdmin();
  let query = admin.from('peakpro_profiles').select('*');
  if (input.userId) query = query.eq('id', input.userId);
  else if (input.subscriptionId) query = query.eq('creem_subscription_id', input.subscriptionId);
  else if (input.customerId) query = query.eq('creem_customer_id', input.customerId);
  else return null;

  const { data: existing } = await query.maybeSingle();
  if (!existing) return null;
  const profile = existing as PeakProProfile;

  const { data } = await admin
    .from('peakpro_profiles')
    .update({
      tier: 'free',
      revoked_at: new Date().toISOString(),
      revoke_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select('*')
    .maybeSingle();

  return (data as PeakProProfile | null) ?? profile;
}

export async function findPeakProProfile(input: {
  userId?: string | null;
  email?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<PeakProProfile | null> {
  const admin = peakproAdmin();
  if (input.userId) {
    const { data } = await admin.from('peakpro_profiles').select('*').eq('id', input.userId).maybeSingle();
    if (data) return data as PeakProProfile;
  }
  if (input.subscriptionId) {
    const { data } = await admin
      .from('peakpro_profiles')
      .select('*')
      .eq('creem_subscription_id', input.subscriptionId)
      .maybeSingle();
    if (data) return data as PeakProProfile;
  }
  if (input.customerId) {
    const { data } = await admin
      .from('peakpro_profiles')
      .select('*')
      .eq('creem_customer_id', input.customerId)
      .maybeSingle();
    if (data) return data as PeakProProfile;
  }
  if (input.email) {
    const { data } = await admin
      .from('peakpro_profiles')
      .select('*')
      .eq('email', input.email.toLowerCase())
      .maybeSingle();
    if (data) return data as PeakProProfile;
  }
  return null;
}
