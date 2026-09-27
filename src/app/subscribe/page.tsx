import { PeakProSubscribeView } from '@/components/peakpro/subscribe-view';
import { getLocale } from '@/i18n/server';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { createClient } from '@/lib/supabase/server';

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ revoked?: string; billing_error?: string }>;
}) {
  const locale = await getLocale();
  const { revoked, billing_error: billingError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const session = await loadPeakProSession(user?.id ?? null, user?.email ?? null);

  return (
    <PeakProSubscribeView
      locale={locale}
      session={session}
      revoked={revoked === '1'}
      billingError={billingError}
    />
  );
}
