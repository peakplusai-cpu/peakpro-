'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';

import { Notice } from '@/components/peakpro/notice';
import type { Locale } from '@/i18n/locale';
import { tPeakpro, tPeakproDesk } from '@/lib/peakpro/copy';
import { usePeakPro } from '@/components/peakpro/provider';
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
  const { desk } = usePeakPro();
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
    if (code === 'limit') return tPeakproDesk(locale, desk, 'advisorLimit');
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
      setError(tPeakproDesk(locale, desk, 'advisorLimit'));
      return;
    }

    const nextTurns: Turn[] = [...turns, { role: 'user', content: text.slice(0, ADVISOR_MAX_INPUT) }];
    setTurns(nextTurns);
    setDraft('');
    setPending(true);
    setError(null);
    let assistant = '';

    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 55_000);

    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal: abort.signal,
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
      setTurns([...nextTurns, { role: 'assistant', content: '' }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const snapshot = assistant;
        setTurns([...nextTurns, { role: 'assistant', content: snapshot }]);
      }
      assistant += decoder.decode();
      if (!assistant.trim()) {
        setTurns(nextTurns.slice(0, -1));
        setDraft(text);
        setError(tPeakpro(locale, 'advisorFailed'));
        return;
      }
      setTurns([...nextTurns, { role: 'assistant', content: assistant }]);
    } catch {
      if (!assistant) {
        setTurns(nextTurns.slice(0, -1));
        setDraft(text);
        setError(tPeakpro(locale, 'advisorFailed'));
      }
    } finally {
      window.clearTimeout(timer);
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
        <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">{tPeakpro(locale, 'advisorTitle')}</h2>
        {tPeakproDesk(locale, desk, 'advisorLead') ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            {tPeakproDesk(locale, desk, 'advisorLead')}
          </p>
        ) : null}
        {quotaLabel ? (
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">{quotaLabel}</p>
        ) : null}
      </div>

      <div className="peakpro-panel overflow-hidden">
        <div className="max-h-[min(28rem,55vh)] space-y-4 overflow-y-auto px-5 py-6">
          {turns.length === 0 ? (
            tPeakpro(locale, 'advisorEmpty') ? (
              <p className="text-sm leading-relaxed text-zinc-500">{tPeakpro(locale, 'advisorEmpty')}</p>
            ) : null
          ) : (
            turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed',
                    turn.role === 'user'
                      ? 'border-r-2 border-signal bg-signal/10 text-ice'
                      : 'border-l-2 border-plasma/70 bg-void-panel/80 text-zinc-300',
                  )}
                >
                  {turn.content || (pending && index === turns.length - 1 ? '…' : '')}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="border-t border-signal/10 p-4">
          {error ? <Notice role="alert" className="mb-3">{error}</Notice> : null}
          <div className="flex items-end gap-2">
            <textarea
              ref={boxRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, ADVISOR_MAX_INPUT))}
              onKeyDown={onKeyDown}
              rows={3}
              disabled={false}
              placeholder={tPeakproDesk(locale, desk, 'advisorPlaceholder')}
              className="peakpro-input !h-auto min-h-[4.5rem] flex-1 resize-none py-3"
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="peakpro-btn !h-11 !w-11 !p-0"
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
                className="peakpro-btn-ghost !h-11 !w-11 !p-0"
                aria-label={tPeakpro(locale, 'advisorClear')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {tPeakpro(locale, 'advisorFoot') ? (
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'advisorFoot')}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
