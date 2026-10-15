import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { PeakProPrintReport } from '@/components/peakpro/print-report';
import { getLocale } from '@/i18n/server';
import { tPeakpro } from '@/lib/peakpro/copy';
import { eventsForDesk, eventStatus } from '@/lib/peakpro/macro-calendar';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';
import { ensureDeskPrintReport } from '@/lib/peakpro/print-report';

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
  const event =
    current && session.tier === 'premium' && current.status !== 'upcoming'
      ? await ensureDeskPrintReport(current, desk, cache, { upgradeTemplate: true })
      : current;

  return (
    <PeakProAppShell locale={locale} session={session} moduleId="overview" cache={cache}>
      {session.tier === 'premium' ? (
        <PeakProPrintReport locale={locale} desk={desk} event={event} />
      ) : (
        <PeakProPaywall locale={locale} body={tPeakpro(locale, 'calendarLocked')} />
      )}
    </PeakProAppShell>
  );
}
