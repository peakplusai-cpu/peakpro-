import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { getAppOrigin } from '@/lib/env';
import { createPeakProPortalUrl } from '@/lib/peakpro/creem';
import { loadPeakProSession } from '@/lib/peakpro/profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = getAppOrigin();
  const { user } = await requireAuthUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent('/api/billing/portal')}`,
    );
  }

  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (!session.customerId) {
    return NextResponse.redirect(
      `${origin}/subscribe?billing_error=${encodeURIComponent('No payment method is on file yet.')}`,
    );
  }

  const { url, error } = await createPeakProPortalUrl(session.customerId);
  if (!url) {
    return NextResponse.redirect(
      `${origin}/subscribe?billing_error=${encodeURIComponent(error ?? 'Creem portal could not be opened.')}`,
    );
  }

  return NextResponse.redirect(url);
}
