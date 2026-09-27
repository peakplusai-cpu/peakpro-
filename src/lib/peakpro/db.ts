import { createAdminClient } from '@/lib/supabase/admin';

// PeakPro+ warehouse tables are not yet in the generated Database type.
// Service-role only — never import this module from a client component.
export function peakproAdmin() {
  return createAdminClient() as unknown as {
    from: (table: string) => {
      select: (columns?: string) => any;
      insert: (values: unknown) => any;
      upsert: (values: unknown, options?: unknown) => any;
      update: (values: unknown) => any;
      delete: () => any;
    };
  };
}
