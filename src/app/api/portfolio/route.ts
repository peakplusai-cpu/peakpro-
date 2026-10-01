import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { markLots } from '@/lib/peakpro/portfolio-mark';
import {
  isPortfolioBook,
  parseLotSymbol,
  PORTFOLIO_MAX_LOTS,
  totalsByCurrency,
  type PortfolioLot,
} from '@/lib/peakpro/portfolio';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { fetchYahooQuote } from '@/lib/peakpro/yahoo';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function asLot(row: Record<string, unknown>): PortfolioLot {
  return {
    id: String(row.id),
    book: row.book as PortfolioLot['book'],
    symbol: String(row.symbol),
    quantity: Number(row.quantity),
    cost: Number(row.cost),
    currency: row.currency === 'TWD' ? 'TWD' : 'USD',
    bought_on: typeof row.bought_on === 'string' ? row.bought_on : null,
    created_at: String(row.created_at),
  };
}

export async function GET() {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('peakpro_lots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    if (/peakpro_lots|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ error: 'setup', lots: [], totals: totalsByCurrency([]) }, { status: 503 });
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const lots = ((data ?? []) as Record<string, unknown>[]).map(asLot);
  const marked = await markLots(lots);
  return NextResponse.json({ ok: true, lots: marked, totals: totalsByCurrency(marked) });
}

export async function POST(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    book?: unknown;
    query?: unknown;
    quantity?: unknown;
    cost?: unknown;
    bought_on?: unknown;
  } | null;
  if (!isPortfolioBook(body?.book)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const parsed = parseLotSymbol(body.book, typeof body.query === 'string' ? body.query : '');
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const quantity = Number(body?.quantity);
  const cost = Number(body?.cost);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity >= 1_000_000_000) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!Number.isFinite(cost) || cost < 0 || cost >= 1_000_000_000) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const quote = await fetchYahooQuote(parsed.symbol === 'GC=F' ? 'GC=F' : parsed.symbol);
  if (!quote?.regularMarketPrice) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const boughtOn =
    typeof body?.bought_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.bought_on)
      ? body.bought_on
      : null;

  const admin = createAdminClient();
  const { count } = await admin
    .from('peakpro_lots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) >= PORTFOLIO_MAX_LOTS) {
    return NextResponse.json({ error: 'limit' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('peakpro_lots')
    .insert({
      user_id: user.id,
      book: body.book,
      symbol: parsed.symbol,
      quantity,
      cost,
      currency: parsed.currency,
      bought_on: boughtOn,
    })
    .select('*')
    .maybeSingle();
  if (error || !data) {
    if (error && /peakpro_lots|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ error: 'setup' }, { status: 503 });
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const [marked] = await markLots([asLot(data as Record<string, unknown>)]);
  return NextResponse.json({ ok: true, lot: marked });
}
