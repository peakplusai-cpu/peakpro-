import { PEAKPRO_MODULES, isPeakProModule, type PeakProModule } from '@/lib/peakpro/constants';
import { eventsForDesk } from '@/lib/peakpro/macro-calendar';
import type { PeakProCacheSnapshot } from '@/lib/peakpro/types';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export const DESK_COOKIE = 'PEAKPRO_DESK';
export type DeskRegion = 'tw' | 'us' | 'crypto';
export type EquityDesk = 'tw' | 'us';

const US_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP']);

export function isDeskRegion(value: string | undefined | null): value is DeskRegion {
  return value === 'tw' || value === 'us' || value === 'crypto';
}

export function asEquityDesk(desk: DeskRegion): EquityDesk {
  return desk === 'tw' ? 'tw' : 'us';
}

export function deskRegionFromCountry(country: string | null | undefined): DeskRegion {
  const code = country?.trim().toUpperCase() ?? '';
  return US_COUNTRIES.has(code) ? 'us' : 'tw';
}

const CRYPTO_DESK_MODULES: PeakProModule[] = [
  'overview',
  'crypto',
  'learn',
  'portfolio',
  'gold',
  'geopolitics',
  'sentiment',
  'brief',
  'advisor',
];

export function modulesForDesk(desk: DeskRegion): PeakProModule[] {
  if (desk === 'crypto') return CRYPTO_DESK_MODULES;
  if (desk === 'us') return PEAKPRO_MODULES.filter((id) => id !== 'taiwan');
  return [...PEAKPRO_MODULES];
}

export function destinationForDeskSwitch(pathname: string, next: DeskRegion): string | null {
  if (!pathname.startsWith('/app')) return null;
  if (next === 'crypto') {
    if (pathname.startsWith('/app/crypto')) return null;
    const segment = pathname.slice('/app/'.length).split('/')[0] ?? '';
    if (segment && isPeakProModule(segment) && CRYPTO_DESK_MODULES.includes(segment) && segment !== 'overview') {
      return null;
    }
    return '/app/crypto';
  }
  if (next === 'us' && pathname.startsWith('/app/taiwan')) return '/app/us';
  return null;
}

export function stripTaiwanCache(cache: PeakProCacheSnapshot, desk: DeskRegion): PeakProCacheSnapshot {
  if (desk !== 'us') return cache;
  return {
    ...cache,
    equities: cache.equities.filter((row) => !isTaiwanSymbol(row.symbol)),
    calendar: cache.calendar
      ? { ...cache.calendar, events: eventsForDesk(cache.calendar, 'us') }
      : null,
  };
}
