import { peakproSignIn, peakproSignUp } from '@/app/login/actions';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

const inputClass =
  'flex h-11 w-full rounded-xl border border-gold/20 bg-black px-4 text-sm text-white placeholder:text-zinc-600 focus:border-gold focus:outline-none';

export function PeakProLoginForm({
  locale,
  error,
  redirectTo,
}: {
  locale: Locale;
  error?: string;
  redirectTo?: string;
}) {
  return (
    <div className="space-y-8">
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <form action={peakproSignIn} className="space-y-4">
        {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
        <div>
          <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">
            {tPeakpro(locale, 'email')}
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">
            {tPeakpro(locale, 'password')}
          </label>
          <input id="password" name="password" type="password" required className={inputClass} />
        </div>
        <button type="submit" className="w-full rounded-full bg-gold py-3 text-sm font-semibold text-black">
          {tPeakpro(locale, 'signIn')}
        </button>
      </form>
      <form action={peakproSignUp} className="space-y-4 border-t border-gold/10 pt-6">
        {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
        <div>
          <label htmlFor="signup-email" className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">
            {tPeakpro(locale, 'email')}
          </label>
          <input id="signup-email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">
            {tPeakpro(locale, 'password')}
          </label>
          <input id="signup-password" name="password" type="password" required minLength={6} className={inputClass} />
        </div>
        <button
          type="submit"
          className="w-full rounded-full border border-gold/40 py-3 text-sm font-semibold text-gold"
        >
          {tPeakpro(locale, 'signUp')}
        </button>
      </form>
    </div>
  );
}
