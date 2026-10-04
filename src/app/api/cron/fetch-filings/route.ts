import { after, NextResponse } from 'next/server';

import { authorizePeakProCron } from '@/lib/peakpro/cron-auth';
import { runPeakProFilingsScrape } from '@/lib/peakpro/scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizePeakProCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wait = new URL(request.url).searchParams.get('wait') === '1';
  if (wait) {
    const filings = await runPeakProFilingsScrape();
    return NextResponse.json({ ok: true, filings });
  }

  after(async () => {
    try {
      await runPeakProFilingsScrape();
    } catch (error) {
      console.warn('[peakpro/cron] filings scrape failed', error);
    }
  });

  return NextResponse.json({ ok: true, accepted: true });
}
