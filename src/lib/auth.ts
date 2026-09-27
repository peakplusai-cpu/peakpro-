import { createClient } from '@/lib/supabase/server';

export async function requireAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: error?.message ?? 'Unauthorized' };
  }

  return { supabase, user, error: null };
}
