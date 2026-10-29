'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import type { Locale } from '@/i18n/locale';
import { destinationForDeskSwitch, type DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';
import { cn } from '@/lib/utils';

const DESKS: DeskRegion[] = ['tw', 'us', 'crypto'];

function deskLabelKey(desk: DeskRegion): 'deskTw' | 'deskUs' | 'deskCrypto' {
  if (desk === 'us') return 'deskUs';
  if (desk === 'crypto') return 'deskCrypto';
  return 'deskTw';
}

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
      const dest = destinationForDeskSwitch(pathname, next);
      if (dest) {
        window.location.assign(dest);
        return;
      }
      router.refresh();
      window.location.reload();
    });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center border border-signal/25 bg-void-panel/80 p-0.5',
        pending && 'opacity-60',
      )}
      role="group"
      aria-label={tPeakpro(locale, 'deskAria')}
    >
      {DESKS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setDesk(id)}
          className={cn(
            'px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors',
            desk === id ? 'bg-signal text-void' : 'text-zinc-400 hover:text-signal',
          )}
        >
          {tPeakpro(locale, deskLabelKey(id))}
        </button>
      ))}
    </div>
  );
}
