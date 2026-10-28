import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { loadBitgetCryptoDesk, loadBitgetName } from '@/lib/peakpro/bitget';
import { normalizeCryptoSymbol } from '@/lib/peakpro/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const raw = new URL(request.url).searchParams.get('symbol');
  try {
    if (raw) {
      const parsed = normalizeCryptoSymbol(raw);
      if (parsed.error) return NextResponse.json({ error: 'invalid' }, { status: 400 });
      const tape = await loadBitgetName(parsed.symbol);
      if (!tape) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json(tape);
    }
    const desk = await loadBitgetCryptoDesk();
    return NextResponse.json(desk);
  } catch (error) {
    console.warn('[peakpro/bitget] desk failed', error);
    return NextResponse.json({ error: 'bitget' }, { status: 502 });
  }
}
