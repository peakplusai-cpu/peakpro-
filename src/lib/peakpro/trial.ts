import { TRIAL_DAYS } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';

export type TrialClaim =
  | { status: 'new'; expiresAt: string }
  | { status: 'own-active'; expiresAt: string }
  | { status: 'denied' };

type TrialGrantRow = {
  email_key: string;
  user_id: string;
  expires_at: string;
};

function daysFromNow(days: number): string {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}

function isFuture(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || /duplicate key/i.test(error.message ?? '');
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /peakpro_trial_grants/i.test(error.message ?? '');
}

/** One lifetime key per mailbox. Gmail dots / plus-tags collapse to the same person. */
export function normalizeTrialEmail(email: string | null | undefined): string | null {
  const raw = email?.trim().toLowerCase() ?? '';
  const at = raw.lastIndexOf('@');
  if (at <= 0 || at === raw.length - 1) return null;
  let local = raw.slice(0, at);
  let domain = raw.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') {
    local = local.split('+')[0]?.replace(/\./g, '') ?? '';
  }
  if (!local || !domain || domain.includes(' ')) return null;
  return `${local}@${domain}`;
}

async function readGrant(
  admin: ReturnType<typeof peakproAdmin>,
  userId: string,
  emailKey: string,
): Promise<TrialGrantRow | null> {
  const byEmail = await admin
    .from('peakpro_trial_grants')
    .select('email_key, user_id, expires_at')
    .eq('email_key', emailKey)
    .maybeSingle();
  if (isMissingTable(byEmail.error)) {
    console.warn('[peakpro/trial] peakpro_trial_grants missing — trial sealed closed');
    return null;
  }
  if (byEmail.data) return byEmail.data as TrialGrantRow;

  const byUser = await admin
    .from('peakpro_trial_grants')
    .select('email_key, user_id, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (byUser.data as TrialGrantRow | null) ?? null;
}

/**
 * Lifetime lock. First successful insert wins.
 * Same user / same mailbox never gets a second grant, including after account deletion.
 * If the ledger table is missing, deny the trial instead of handing out Premium.
 */
export async function claimTrialGrant(userId: string, email: string | null): Promise<TrialClaim> {
  const emailKey = normalizeTrialEmail(email);
  if (!emailKey) return { status: 'denied' };

  try {
    const admin = peakproAdmin();
    const existing = await readGrant(admin, userId, emailKey);
    if (existing) {
      if (existing.user_id === userId && isFuture(existing.expires_at)) {
        return { status: 'own-active', expiresAt: existing.expires_at };
      }
      return { status: 'denied' };
    }

    const expiresAt = daysFromNow(TRIAL_DAYS);
    const inserted = await admin
      .from('peakpro_trial_grants')
      .insert({
        email_key: emailKey,
        user_id: userId,
        expires_at: expiresAt,
      })
      .select('email_key, user_id, expires_at')
      .maybeSingle();

    if (inserted.data) return { status: 'new', expiresAt };

    if (isMissingTable(inserted.error)) {
      console.warn('[peakpro/trial] peakpro_trial_grants missing — trial sealed closed');
      return { status: 'denied' };
    }

    if (isUniqueViolation(inserted.error)) {
      const raced = await readGrant(admin, userId, emailKey);
      if (raced?.user_id === userId && isFuture(raced.expires_at)) {
        return { status: 'own-active', expiresAt: raced.expires_at };
      }
      return { status: 'denied' };
    }

    if (inserted.error) {
      console.warn('[peakpro/trial] claim failed', inserted.error);
      return { status: 'denied' };
    }
    return { status: 'denied' };
  } catch (error) {
    console.warn('[peakpro/trial] claim unavailable', error);
    return { status: 'denied' };
  }
}

/** Stamp the ledger for a trial already on the profile so delete-and-return cannot replay it. */
export async function sealTrialGrant(
  userId: string,
  email: string | null,
  expiresAt: string | null,
): Promise<void> {
  const emailKey = normalizeTrialEmail(email);
  if (!emailKey) return;
  try {
    const admin = peakproAdmin();
    const { error } = await admin.from('peakpro_trial_grants').insert({
      email_key: emailKey,
      user_id: userId,
      expires_at: expiresAt ?? daysFromNow(TRIAL_DAYS),
    });
    if (error && !isUniqueViolation(error) && !isMissingTable(error)) {
      console.warn('[peakpro/trial] seal failed', error);
    }
  } catch (error) {
    console.warn('[peakpro/trial] seal unavailable', error);
  }
}
