import { cookies, headers } from 'next/headers';

import { PEAKPRO_MODULES, type PeakProModule } from '@/lib/peakpro/constants';
import type { PeakProCacheSnapshot } from '@/lib/peakpro/types';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export const DESK_COOKIE = 'PEAKPRO_DESK';
export type DeskRegion = 'tw' | 'us';

const US_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP']);

export function isDeskRegion(value: string | undefined | null): value is DeskRegion {
  return value === 'tw' || value === 'us';
}

export function deskRegionFromCountry(country: string | null | undefined): DeskRegion {
  const code = country?.trim().toUpperCase() ?? '';
  return US_COUNTRIES.has(code) ? 'us' : 'tw';
}

export function modulesForDesk(desk: DeskRegion): PeakProModule[] {
  if (desk === 'us') return PEAKPRO_MODULES.filter((id) => id !== 'taiwan');
  return [...PEAKPRO_MODULES];
}

export function stripTaiwanCache(cache: PeakProCacheSnapshot, desk: DeskRegion): PeakProCacheSnapshot {
  if (desk !== 'us') return cache;
  return {
    ...cache,
    equities: cache.equities.filter((row) => !isTaiwanSymbol(row.symbol)),
  };
}

export async function getDeskRegion(): Promise<DeskRegion> {
  const jar = await cookies();
  const pinned = jar.get(DESK_COOKIE)?.value;
  if (isDeskRegion(pinned)) return pinned;
  const h = await headers();
  const country =
    h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? h.get('x-country') ?? null;
  return deskRegionFromCountry(country);
}
