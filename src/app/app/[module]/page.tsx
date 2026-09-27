import { notFound } from 'next/navigation';

import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { getLocale } from '@/i18n/server';
import { isPeakProModule } from '@/lib/peakpro/constants';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { module: moduleId } = await params;
  if (!isPeakProModule(moduleId) || moduleId === 'overview') notFound();

  const locale = await getLocale();
  const { highlight } = await searchParams;
  const { session, cache } = await loadPeakProDesk({
    localizeNews: moduleId === 'geopolitics',
  });

  return (
    <PeakProAppShell
      locale={locale}
      session={session}
      moduleId={moduleId}
      cache={cache}
      highlight={highlight?.trim()}
    />
  );
}
