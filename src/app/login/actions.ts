'use server';

import { redirect } from 'next/navigation';

import { safeInternalPath } from '@/lib/peakpro/paths';
import { ensurePeakProProfile } from '@/lib/peakpro/profile';
import { createClient } from '@/lib/supabase/server';

function loginPath(message: string): string {
  return `/login?error=${encodeURIComponent(message)}`;
}

function formatAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Sign-in is rate limited. Wait a minute and try again.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }
  return message;
}

function resolveRedirect(value: FormDataEntryValue | null, fallback = '/app'): string {
  return safeInternalPath(typeof value === 'string' ? value : null, fallback);
}

function resolveSignupRedirect(value: FormDataEntryValue | null): string {
  return safeInternalPath(typeof value === 'string' ? value : null, '/app');
}

export async function peakproSignIn(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  if (typeof email !== 'string' || typeof password !== 'string') {
    redirect(loginPath('Email and password are required.'));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(loginPath(formatAuthError(error.message)));
  if (data.user) await ensurePeakProProfile(data.user.id, data.user.email ?? email);
  redirect(resolveRedirect(formData.get('redirect')));
}

export async function peakproSignUp(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  if (typeof email !== 'string' || typeof password !== 'string') {
    redirect(loginPath('Email and password are required.'));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(loginPath(formatAuthError(error.message)));
  if (data.user) await ensurePeakProProfile(data.user.id, data.user.email ?? email);
  redirect(resolveSignupRedirect(formData.get('redirect')));
}

export async function peakproSignOut(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(safeInternalPath(typeof formData.get('next') === 'string' ? String(formData.get('next')) : null, '/'));
}
