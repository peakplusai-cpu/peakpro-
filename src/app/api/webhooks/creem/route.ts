import { NextResponse } from 'next/server';

import { verifyCreemSignature } from '@/lib/creem';
import { handlePeakProCreemWebhook } from '@/lib/peakpro/creem';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyCreemSignature(rawBody, request.headers.get('creem-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const result = await handlePeakProCreemWebhook(rawBody);
  return result ?? NextResponse.json({ received: true, skipped: true });
}
