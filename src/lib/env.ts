export function getAppOrigin(): string {
  return (
    process.env.SITE_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    (process.env.VERCEL_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
      : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

function requireStaticEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`Missing environment variable: ${name}`);
  return trimmed;
}

export function getSupabaseUrl(): string {
  return requireStaticEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return requireStaticEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabaseServiceRoleKey(): string {
  return requireStaticEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
}
