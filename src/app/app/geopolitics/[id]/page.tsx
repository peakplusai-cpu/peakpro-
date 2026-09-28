import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { PeakProNewsDetail } from '@/components/peakpro/news-detail';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { getLocale } from '@/i18n/server';
import { canAccessModule } from '@/lib/peakpro/access';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';

export default async function GeopoliticsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const { session, cache } = await loadPeakProDesk({ localizeNews: true });
  const item = cache.news.find((row) => row.id === decodeURIComponent(id)) ?? null;

  return (
    <PeakProAppShell locale={locale} session={session} moduleId="geopolitics" cache={cache}>
      {canAccessModule(session.tier, 'geopolitics') ? (
        <PeakProNewsDetail locale={locale} item={item} />
      ) : (
        <PeakProPaywall locale={locale} />
      )}
    </PeakProAppShell>
  );
}
