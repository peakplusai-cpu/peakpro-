'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { ADVISOR_MAX_INPUT } from '@/lib/peakpro/constants';
import { cn } from '@/lib/utils';

type Turn = { role: 'user' | 'assistant'; content: string };

type QuotaState = {
  used: number;
  remaining: number | null;
  limit: number;
  ready: boolean;
  configured: boolean;
};

export function PeakProAdvisorChat({ locale }: { locale: Locale }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const quotaLabel = useMemo(() => {
    if (!quota) return tPeakpro(locale, 'advisorQuotaLoading');
    if (!quota.configured) return tPeakpro(locale, 'advisorOffline');
    if (!quota.ready || quota.remaining == null) return tPeakpro(locale, 'advisorQuotaPending');
    return tPeakpro(locale, 'advisorQuota')
      .replace('{used}', String(quota.used))
      .replace('{limit}', String(quota.limit));
  }, [locale, quota]);

  async function loadQuota() {
    const response = await fetch('/api/advisor', { credentials: 'same-origin' });
    const json = (await response.json().catch(() => null)) as
      | (QuotaState & { error?: string })
      | null;
    if (!response.ok) {
      setError(
        json?.error === 'premium'
          ? tPeakpro(locale, 'advisorNeedPremium')
          : tPeakpro(locale, 'advisorFailed'),
      );
      return;
    }
    setQuota({
      used: json?.used ?? 0,
      remaining: json?.remaining ?? null,
      limit: json?.limit ?? 30,
      ready: Boolean(json?.ready),
      configured: Boolean(json?.configured),
    });
  }

  useEffect(() => {
    void loadQuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, pending]);

  function errorFromCode(code: string | undefined) {
    if (code === 'limit') return tPeakpro(locale, 'advisorLimit');
    if (code === 'too_long') return tPeakpro(locale, 'advisorTooLong');
    if (code === 'ai_offline') return tPeakpro(locale, 'advisorOffline');
    if (code === 'premium') return tPeakpro(locale, 'advisorNeedPremium');
    if (code === 'login') return tPeakpro(locale, 'advisorNeedLogin');
    return tPeakpro(locale, 'advisorFailed');
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    if (quota && quota.configured === false) {
      setError(tPeakpro(locale, 'advisorOffline'));
      return;
    }
    if (quota?.ready && quota.remaining === 0) {
      setError(tPeakpro(locale, 'advisorLimit'));
      return;
    }

    const nextTurns: Turn[] = [...turns, { role: 'user', content: text.slice(0, ADVISOR_MAX_INPUT) }];
    setTurns(nextTurns);
    setDraft('');
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: nextTurns }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        setTurns(nextTurns.slice(0, -1));
        setDraft(text);
        setError(errorFromCode(json?.error));
        if (response.status === 429) await loadQuota();
        return;
      }

      const remainingHeader = response.headers.get('X-Advisor-Remaining');
      const usedHeader = response.headers.get('X-Advisor-Used');
      const limitHeader = response.headers.get('X-Advisor-Limit');
      const readyHeader = response.headers.get('X-Advisor-Quota-Ready');
      if (usedHeader && limitHeader) {
        setQuota((prev) => ({
          used: Number(usedHeader),
          remaining: remainingHeader === '' || remainingHeader == null ? null : Number(remainingHeader),
          limit: Number(limitHeader),
          ready: readyHeader === '1',
          configured: prev?.configured ?? true,
        }));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError(tPeakpro(locale, 'advisorFailed'));
        return;
      }

      const decoder = new TextDecoder();
      let assistant = '';
      setTurns([...nextTurns, { role: 'assistant', content: '' }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const snapshot = assistant;
        setTurns([...nextTurns, { role: 'assistant', content: snapshot }]);
      }
      assistant += decoder.decode();
      setTurns([...nextTurns, { role: 'assistant', content: assistant }]);
    } catch {
      setTurns(nextTurns.slice(0, -1));
      setDraft(text);
      setError(tPeakpro(locale, 'advisorFailed'));
    } finally {
      setPending(false);
      boxRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'advisorTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'advisorLead')}</p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">{quotaLabel}</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gold/15 bg-black/60">
        <div className="max-h-[min(28rem,55vh)] space-y-4 overflow-y-auto px-5 py-6">
          {turns.length === 0 ? (
            <p className="text-sm leading-relaxed text-zinc-500">{tPeakpro(locale, 'advisorEmpty')}</p>
          ) : (
            turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    turn.role === 'user'
                      ? 'bg-gold/15 text-zinc-100'
                      : 'border border-gold/15 bg-zinc-950 text-zinc-300',
                  )}
                >
                  {turn.content || (pending && index === turns.length - 1 ? '…' : '')}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="border-t border-gold/10 p-4">
          {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
          <div className="flex items-end gap-2">
            <textarea
              ref={boxRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, ADVISOR_MAX_INPUT))}
              onKeyDown={onKeyDown}
              rows={3}
              disabled={pending}
              placeholder={tPeakpro(locale, 'advisorPlaceholder')}
              className="min-h-[4.5rem] flex-1 resize-none rounded-2xl border border-gold/20 bg-black px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-gold/50"
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold text-black disabled:opacity-40"
                aria-label={tPeakpro(locale, 'advisorSend')}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  setError(null);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 text-zinc-500 hover:text-gold"
                aria-label={tPeakpro(locale, 'advisorClear')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'advisorFoot')}</p>
        </form>
      </div>
    </div>
  );
}
