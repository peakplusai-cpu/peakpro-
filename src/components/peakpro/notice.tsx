import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Status banner: warn (amber) for failures, ok (signal) for confirmations. */
export function Notice({
  tone = 'warn',
  children,
  className,
  role,
}: {
  tone?: 'warn' | 'ok';
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  return (
    <p
      role={role}
      className={cn(
        'border-l-2 px-4 py-3 text-sm',
        tone === 'warn'
          ? 'border-warn bg-warn/10 text-warn'
          : 'border-signal bg-signal/10 text-signal',
        className,
      )}
    >
      {children}
    </p>
  );
}
