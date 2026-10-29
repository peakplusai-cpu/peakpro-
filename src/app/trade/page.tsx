import { TradeLanding } from '@/components/peakpro/trade-landing';
import { getLocale } from '@/i18n/server';
import { requireAuthUser } from '@/lib/auth';
import { loadPeakProSession } from '@/lib/peakpro/profile';

export default async function TradeHomePage() {
  const locale = await getLocale();
  const { user } = await requireAuthUser();
  const session = user ? await loadPeakProSession(user.id, user.email ?? null) : null;
  return <TradeLanding locale={locale} session={session} />;
}
