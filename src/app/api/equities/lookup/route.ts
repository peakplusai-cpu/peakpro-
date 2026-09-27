import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { canAccessEquity } from '@/lib/peakpro/access';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { ingestEquitySymbol } from '@/lib/peakpro/scraper';
import { normalizeEquityQuery, type EquityMarket } from '@/lib/peakpro/yahoo';

export const dynamic = 'force-dynamic';

function isMarket(value: unknown): value is EquityMarket {
  return value === 'taiwan' || value === 'us';
}

export async function POST(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const session = await loadPeakProSession(user.id, user.email ?? null);
  const body = (await request.json().catch(() => null)) as { query?: string; market?: string } | null;
  if (!isMarket(body?.market)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const parsed = normalizeEquityQuery(body?.query ?? '', body.market);
  if (parsed.error === 'empty' || parsed.error === 'invalid') {
    return NextResponse.json({ error: parsed.error || 'invalid' }, { status: 400 });
  }
  if (parsed.error === 'wrong_market') {
    return NextResponse.json({ error: 'wrong_market' }, { status: 400 });
  }

  const freeVisible = canAccessEquity(session.tier, parsed.symbol, 'monthly');
  if (session.tier !== 'premium' && !freeVisible) {
    return NextResponse.json({ error: 'premium' }, { status: 403 });
  }

  const ingested = await ingestEquitySymbol(parsed.symbol);
  if (!ingested) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    symbol: parsed.symbol,
    name: ingested.name,
    rows: ingested.rows,
  });
}
