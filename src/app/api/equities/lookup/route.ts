import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { canAccessEquity } from '@/lib/peakpro/access';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { ingestEquitySymbol } from '@/lib/peakpro/scraper';
import { resolveEquityLookup, searchEquitySymbols } from '@/lib/peakpro/symbol-search';
import type { EquityMarket } from '@/lib/peakpro/yahoo';

export const dynamic = 'force-dynamic';

function isMarket(value: unknown): value is EquityMarket {
  return value === 'taiwan' || value === 'us';
}

async function ingestResolved(symbol: string, query: string, market: EquityMarket, fromTicker?: boolean) {
  const ingested = await ingestEquitySymbol(symbol);
  if (ingested) return { symbol, name: ingested.name, rows: ingested.rows };
  if (!fromTicker) return null;
  const fallback = (await searchEquitySymbols(query, market, 1))[0];
  if (!fallback || fallback.symbol === symbol) return null;
  const again = await ingestEquitySymbol(fallback.symbol);
  return again ? { symbol: fallback.symbol, name: again.name, rows: again.rows } : null;
}

export async function POST(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const session = await loadPeakProSession(user.id, user.email ?? null);
  const body = (await request.json().catch(() => null)) as { query?: string; market?: string } | null;
  if (!isMarket(body?.market)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const resolved = await resolveEquityLookup(body?.query ?? '', body.market);
  if (resolved.error === 'empty' || resolved.error === 'invalid') {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  if (resolved.error === 'wrong_market') {
    return NextResponse.json({ error: 'wrong_market' }, { status: 400 });
  }
  if (resolved.error === 'ambiguous') {
    return NextResponse.json({ error: 'ambiguous', matches: resolved.matches ?? [] }, { status: 409 });
  }
  if (resolved.error === 'not_found' || !resolved.symbol) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const freeVisible = canAccessEquity(session.tier, resolved.symbol, 'monthly');
  if (session.tier !== 'premium' && !freeVisible) {
    return NextResponse.json({ error: 'premium' }, { status: 403 });
  }

  const ingested = await ingestResolved(resolved.symbol, body?.query ?? '', body.market, resolved.fromTicker);
  if (!ingested) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    symbol: ingested.symbol,
    name: ingested.name,
    rows: ingested.rows,
  });
}
