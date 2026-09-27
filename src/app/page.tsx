import { PeakProLanding } from '@/components/peakpro/landing';
import { getLocale } from '@/i18n/server';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <PeakProLanding locale={locale} signedIn={Boolean(user)} />;
}
