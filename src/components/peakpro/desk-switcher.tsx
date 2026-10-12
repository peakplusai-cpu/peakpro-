'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import type { Locale } from '@/i18n/locale';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';
import { cn } from '@/lib/utils';

export function PeakProDeskSwitcher({
  locale,
  desk,
}: {
  locale: Locale;
  desk: DeskRegion;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setDesk = (next: DeskRegion) => {
    if (next === desk || pending) return;
    startTransition(async () => {
      const res = await fetch('/api/desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ desk: next }),
      });
      if (!res.ok) return;
      if (next === 'us' && pathname.startsWith('/app/taiwan')) {
        window.location.assign('/app/us');
        return;
      }
      router.refresh();
      window.location.reload();
    });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-gold/25 bg-black/70 px-2 py-1',
        pending && 'opacity-60',
      )}
      role="group"
      aria-label={tPeakpro(locale, 'deskAria')}
    >
      <button
        type="button"
        onClick={() => setDesk('tw')}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
          desk === 'tw' ? 'bg-gold text-black' : 'text-zinc-400 hover:text-gold',
        )}
      >
        {tPeakpro(locale, 'deskTw')}
      </button>
      <button
        type="button"
        onClick={() => setDesk('us')}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
          desk === 'us' ? 'bg-gold text-black' : 'text-zinc-400 hover:text-gold',
        )}
      >
        {tPeakpro(locale, 'deskUs')}
      </button>
    </div>
  );
}
