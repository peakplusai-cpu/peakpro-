import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { getAppOrigin } from '@/lib/env';
import { createPeakProCheckoutUrl } from '@/lib/peakpro/creem';
import { ensurePeakProProfile } from '@/lib/peakpro/profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = getAppOrigin();
  const { user } = await requireAuthUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent('/api/checkout')}`,
    );
  }

  await ensurePeakProProfile(user.id, user.email ?? null);

  const { url, missing, error } = await createPeakProCheckoutUrl({
    userId: user.id,
    email: user.email ?? undefined,
    origin,
  });

  if (!url) {
    const hint =
      missing.length > 0
        ? `Missing environment: ${missing.join(', ')}`
        : error ?? 'Creem checkout could not be created.';
    return NextResponse.redirect(
      `${origin}/subscribe?billing_error=${encodeURIComponent(hint)}`,
    );
  }

  return NextResponse.redirect(url);
}
