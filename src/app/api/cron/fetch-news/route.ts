import { after, NextResponse } from 'next/server';

import { authorizePeakProCron } from '@/lib/peakpro/cron-auth';
import { runPeakProNewsScrape } from '@/lib/peakpro/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizePeakProCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wait = new URL(request.url).searchParams.get('wait') === '1';
  if (wait) {
    const news = await runPeakProNewsScrape();
    return NextResponse.json({ ok: true, news });
  }

  after(async () => {
    try {
      await runPeakProNewsScrape();
    } catch (error) {
      console.warn('[peakpro/cron] news scrape failed', error);
    }
  });

  return NextResponse.json({ ok: true, accepted: true });
}
