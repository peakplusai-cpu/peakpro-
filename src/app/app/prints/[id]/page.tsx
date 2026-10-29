import { after } from 'next/server';

import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { PeakProPrintReport } from '@/components/peakpro/print-report';
import { getLocale } from '@/i18n/server';
import { asEquityDesk } from '@/lib/peakpro/desk-region';
import { emptyReports, eventsForDesk, eventStatus, reportFits } from '@/lib/peakpro/macro-calendar';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';
import { buildFallbackPrintReport, ensureDeskPrintReport } from '@/lib/peakpro/print-report';

export default async function PrintReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const { session, cache, desk } = await loadPeakProDesk({ moduleId: 'overview' });
  const eventId = decodeURIComponent(id);
  const listed = eventsForDesk(cache.calendar, desk).find((event) => event.id === eventId) ?? null;
  const current = listed ? { ...listed, status: eventStatus(listed.scheduledAt) } : null;
  let event = current;

  if (current && current.status !== 'upcoming') {
    if (!reportFits(current, desk)) {
      const key = asEquityDesk(desk);
      event = {
        ...current,
        reports: {
          ...(current.reports ?? emptyReports()),
          [key]: current.reports?.[key] ?? buildFallbackPrintReport(current),
        },
      };
    }
    if (session.tier === 'premium') {
      after(() =>
        ensureDeskPrintReport(current, desk, cache, { upgradeTemplate: true }).catch((error) => {
          console.warn('[peakpro/prints] report fill failed', error);
        }),
      );
    }
  }

  return (
    <PeakProAppShell locale={locale} session={session} moduleId="overview" cache={cache}>
      <PeakProPrintReport locale={locale} desk={desk} event={event} />
    </PeakProAppShell>
  );
}
