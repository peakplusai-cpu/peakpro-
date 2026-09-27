export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'zh';
}

export function localeHtmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-Hant' : 'en';
}
