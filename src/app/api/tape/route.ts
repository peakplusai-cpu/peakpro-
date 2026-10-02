import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { readPeakProCache } from '@/lib/peakpro/cache';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { loadTapeDesk } from '@/lib/peakpro/tape-store';
import { isTaiwanSymbol, normalizeEquityQuery } from '@/lib/peakpro/yahoo';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const url = new URL(request.url);
  const raw = url.searchParams.get('symbol')?.trim() ?? '';
  const extra: string[] = [];
  if (raw) {
    const market = isTaiwanSymbol(raw) || /^\d{4}$/.test(raw) ? 'taiwan' : 'us';
    const parsed = normalizeEquityQuery(raw, market);
    if (!parsed.error) extra.push(parsed.symbol);
  }

  const admin = createAdminClient();
  const { data: lots } = await admin.from('peakpro_lots').select('symbol,book').eq('user_id', user.id);
  const bookSymbols = ((lots ?? []) as Array<{ symbol?: string; book?: string }>)
    .filter((row) => row.book === 'taiwan' || row.book === 'us')
    .map((row) => String(row.symbol ?? ''))
    .filter(Boolean);

  const cache = await readPeakProCache();
  const { desk, setup } = await loadTapeDesk({
    bookSymbols,
    extraSymbols: extra,
    dailyRows: cache.equities,
  });

  const rows = extra.length > 0 ? desk.rows.filter((row) => extra.includes(row.symbol)) : desk.rows;
  return NextResponse.json({
    ok: true,
    setup,
    desk: { ...desk, rows },
  });
}
