import { NextResponse } from 'next/server';

import { runPeakProMarketScrape } from '@/lib/peakpro/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === 'development';

  const auth = request.headers.get('authorization')?.trim();
  if (auth?.toLowerCase() === `bearer ${secret}`.toLowerCase()) return true;

  const url = new URL(request.url);
  const querySecret =
    url.searchParams.get('cron_secret')?.trim() ?? url.searchParams.get('secret')?.trim();
  return querySecret === secret;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runPeakProMarketScrape();
  return NextResponse.json({ ok: true, ...result });
}
