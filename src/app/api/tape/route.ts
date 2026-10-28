import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { readPeakProCache } from '@/lib/peakpro/cache';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';
import { loadTapeDesk } from '@/lib/peakpro/tape-store';
import { isTaiwanSymbol, normalizeEquityQuery } from '@/lib/peakpro/yahoo';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const region = await getDeskRegion();
  const url = new URL(request.url);
  const raw = url.searchParams.get('symbol')?.trim() ?? '';
  const extra: string[] = [];
  if (raw) {
    const market = isTaiwanSymbol(raw) || /^\d{4}$/.test(raw) ? 'taiwan' : 'us';
    if (!(region === 'us' && market === 'taiwan')) {
      const parsed = normalizeEquityQuery(raw, market);
      if (!parsed.error) extra.push(parsed.symbol);
    }
  }

  const admin = createAdminClient();
  const { data: lots } = await admin.from('peakpro_lots').select('symbol,book').eq('user_id', user.id);
  const bookSymbols = ((lots ?? []) as Array<{ symbol?: string; book?: string }>)
    .filter((row) => (region === 'us' ? row.book === 'us' : row.book === 'taiwan' || row.book === 'us'))
    .map((row) => String(row.symbol ?? ''))
    .filter(Boolean);

  const cache = await readPeakProCache();
  const trend = cache.trending?.payload as {
    taiwan?: Array<{ symbol?: string; last?: number }>;
    us?: Array<{ symbol?: string; last?: number }>;
  } | undefined;
  const twTrend = region === 'us' ? [] : (trend?.taiwan ?? []);
  const usTrend = trend?.us ?? [];
  const marketSymbols = [...twTrend, ...usTrend]
    .filter((item) => typeof item.last === 'number' && item.last > 0)
    .map((item) => String(item.symbol ?? ''))
    .filter(Boolean);
  const { desk, setup } = await loadTapeDesk({
    bookSymbols,
    extraSymbols: [...new Set([...extra, ...marketSymbols])],
    dailyRows: cache.equities,
  });

  const rows = extra.length > 0 ? desk.rows.filter((row) => extra.includes(row.symbol)) : desk.rows;
  return NextResponse.json({
    ok: true,
    setup,
    desk: { ...desk, rows },
  });
}
