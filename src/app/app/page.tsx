import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { getLocale } from '@/i18n/server';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const locale = await getLocale();
  const { payment } = await searchParams;
  const { session, cache } = await loadPeakProDesk({ moduleId: 'overview' });

  return (
    <PeakProAppShell
      locale={locale}
      session={session}
      moduleId="overview"
      cache={cache}
      notice={payment === 'success' ? 'success' : null}
    />
  );
}
