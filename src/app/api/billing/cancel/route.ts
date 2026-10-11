import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { getAppOrigin } from '@/lib/env';
import { cancelPeakProSubscription } from '@/lib/peakpro/creem';
import { loadPeakProSession, revokePeakProPremium } from '@/lib/peakpro/profile';

export const dynamic = 'force-dynamic';

export async function POST() {
  const origin = getAppOrigin();
  const { user } = await requireAuthUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent('/subscribe')}`,
    );
  }

  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (!session.subscriptionId) {
    return NextResponse.redirect(
      `${origin}/subscribe?billing_error=${encodeURIComponent('No trial mandate is on file.')}`,
    );
  }

  const canceled = await cancelPeakProSubscription(session.subscriptionId);
  if (!canceled.ok) {
    return NextResponse.redirect(
      `${origin}/subscribe?billing_error=${encodeURIComponent(canceled.error ?? 'Could not cancel.')}`,
    );
  }

  await revokePeakProPremium({
    userId: user.id,
    subscriptionId: session.subscriptionId,
    reason: 'canceled',
  });

  return NextResponse.redirect(`${origin}/subscribe?canceled=1`);
}
