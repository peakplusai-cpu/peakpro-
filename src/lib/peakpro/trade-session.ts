import { redirect } from 'next/navigation';

import { requireAuthUser } from '@/lib/auth';
import { TRADE_APP_PATH } from '@/lib/peakpro/constants';
import { loadPeakProSession } from '@/lib/peakpro/profile';

export async function requireTradeSession() {
  const { user } = await requireAuthUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(TRADE_APP_PATH)}`);
  const session = await loadPeakProSession(user.id, user.email ?? null);
  return { session };
}
