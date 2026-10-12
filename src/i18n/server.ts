import { cookies } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/locale';
import type { MessageTree } from '@/i18n/translator';
import { getDeskRegion } from '@/lib/peakpro/desk-region';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(value)) return value;
  const desk = await getDeskRegion();
  return desk === 'us' ? 'en' : DEFAULT_LOCALE;
}

export function getMessages(_locale: Locale): MessageTree {
  return {};
}
