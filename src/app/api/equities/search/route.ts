import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { canOpenEquity } from '@/lib/peakpro/access';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { searchEquitySymbols } from '@/lib/peakpro/symbol-search';
import type { EquityMarket } from '@/lib/peakpro/yahoo';

export const dynamic = 'force-dynamic';

function isMarket(value: string | null): value is EquityMarket {
  return value === 'taiwan' || value === 'us';
}

export async function GET(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const session = await loadPeakProSession(user.id, user.email ?? null);
  const url = new URL(request.url);
  const market = url.searchParams.get('market');
  const query = url.searchParams.get('q') ?? '';
  if (!isMarket(market)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const matches = await searchEquitySymbols(query, market, 8);
  const visible =
    session.tier === 'premium' ? matches : matches.filter((hit) => canOpenEquity(session.tier, hit.symbol));

  return NextResponse.json({ ok: true, matches: visible });
}