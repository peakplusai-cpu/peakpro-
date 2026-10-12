import { cookies, headers } from 'next/headers';

import {
  DESK_COOKIE,
  deskRegionFromCountry,
  isDeskRegion,
  type DeskRegion,
} from '@/lib/peakpro/desk-region';

export async function getDeskRegion(): Promise<DeskRegion> {
  const jar = await cookies();
  const pinned = jar.get(DESK_COOKIE)?.value;
  if (isDeskRegion(pinned)) return pinned;
  const h = await headers();
  const country =
    h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? h.get('x-country') ?? null;
  return deskRegionFromCountry(country);
}
