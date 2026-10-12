import { NextResponse } from 'next/server';

import { DESK_COOKIE, isDeskRegion } from '@/lib/peakpro/desk-region';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { desk?: string } | null;
  if (!isDeskRegion(body?.desk)) {
    return NextResponse.json({ error: 'Invalid desk' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, desk: body.desk });
  response.cookies.set(DESK_COOKIE, body.desk, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
