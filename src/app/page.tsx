import { PeakProLanding } from '@/components/peakpro/landing';
import { getLocale } from '@/i18n/server';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const locale = await getLocale();
  const desk = await getDeskRegion();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <PeakProLanding locale={locale} signedIn={Boolean(user)} desk={desk} />;
}
