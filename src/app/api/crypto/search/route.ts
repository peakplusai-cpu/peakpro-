import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { searchBitgetCrypto } from '@/lib/peakpro/bitget';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const matches = await searchBitgetCrypto(query, 8);
  return NextResponse.json({ ok: true, matches });
}
