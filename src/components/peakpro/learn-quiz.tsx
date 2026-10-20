'use client';

import { useEffect, useState } from 'react';

import { Notice } from '@/components/peakpro/notice';
import type { Locale } from '@/i18n/locale';
import { tPeakpro, tPeakproDesk } from '@/lib/peakpro/copy';
import { usePeakPro } from '@/components/peakpro/provider';
import type { PublicQuizItem, QuizWrongItem } from '@/lib/peakpro/learn-quiz-types';
import { cn } from '@/lib/utils';

type Quota = { used: number; remaining: number | null; limit: number };

function text(locale: Locale, value: { zh: string; en: string }) {
  return locale === 'zh' ? value.zh : value.en;
}

function categoryKey(category: PublicQuizItem['category']) {
  if (category === 'indicator') return 'quizCatIndicator';
  if (category === 'market') return 'quizCatMarket';
  return 'quizCatGeneral';
}

export function PeakProLearnQuiz({ locale }: { locale: Locale }) {
  const { desk } = usePeakPro();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicQuizItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    correctCount: number;
    wrong: QuizWrongItem[];
  } | null>(null);

  async function loadQuota() {
    const response = await fetch('/api/learn/quiz', { credentials: 'same-origin' });
    const json = (await response.json().catch(() => null)) as (Quota & { error?: string }) | null;
    if (!response.ok) {
      setError(json?.error === 'login' ? tPeakpro(locale, 'quizLogin') : tPeakpro(locale, 'quizFailed'));
      return;
    }
    setQuota({ used: json?.used ?? 0, remaining: json?.remaining ?? null, limit: json?.limit ?? 5 });
  }

  useEffect(() => {
    void loadQuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function start() {
    if (pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/learn/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'start' }),
      });
      const json = (await response.json().catch(() => null)) as {
        error?: string;
        token?: string;
        questions?: PublicQuizItem[];
        remaining?: number | null;
        used?: number;
        limit?: number;
      } | null;
      if (response.status === 429 || json?.error === 'limit') {
        setError(tPeakproDesk(locale, desk, 'quizLimit'));
        setQuota({ used: json?.used ?? 5, remaining: 0, limit: json?.limit ?? 5 });
        return;
      }
      if (!response.ok || !json?.token || !json.questions) {
        setError(tPeakpro(locale, 'quizFailed'));
        return;
      }
      setToken(json.token);
      setQuestions(json.questions);
      setAnswers({});
      setQuota({ used: json.used ?? 0, remaining: json.remaining ?? null, limit: json.limit ?? 5 });
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (pending || !token) return;
    if (questions.some((item) => answers[item.id] == null)) {
      setError(tPeakpro(locale, 'quizNeedAll'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/learn/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'submit', token, answers }),
      });
      const json = (await response.json().catch(() => null)) as {
        error?: string;
        score?: number;
        total?: number;
        correctCount?: number;
        wrong?: QuizWrongItem[];
        remaining?: number | null;
        used?: number;
        limit?: number;
      } | null;
      if (!response.ok) {
        setError(json?.error === 'expired' ? tPeakpro(locale, 'quizExpired') : tPeakpro(locale, 'quizFailed'));
        return;
      }
      setResult({
        score: json?.score ?? 0,
        total: json?.total ?? 100,
        correctCount: json?.correctCount ?? 0,
        wrong: json?.wrong ?? [],
      });
      setQuota({ used: json?.used ?? 0, remaining: json?.remaining ?? null, limit: json?.limit ?? 5 });
      setToken(null);
      setQuestions([]);
    } finally {
      setPending(false);
    }
  }

  const remaining = quota?.remaining;
  const blocked = remaining === 0;

  return (
    <section className="peakpro-panel space-y-6 px-6 py-8">
      <div>
        <p className="peakpro-kicker">{tPeakpro(locale, 'quizKicker')}</p>
        <h3 className="mt-2 font-peakpro text-2xl font-semibold text-ice">{tPeakpro(locale, 'quizTitle')}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          {tPeakproDesk(locale, desk, 'quizLead')}
        </p>
        {quota ? (
          <p className="mt-2 text-xs text-zinc-500">
            {tPeakpro(locale, 'quizRemain').replace('{n}', String(remaining ?? '—')).replace('{used}', String(quota.used)).replace('{limit}', String(quota.limit))}
          </p>
        ) : null}
      </div>

      {error ? <Notice role="alert">{error}</Notice> : null}

      {result ? (
        <div className="space-y-5">
          <div className="border border-signal/25 bg-signal/5 px-5 py-5">
            <p className="peakpro-kicker">{tPeakpro(locale, 'quizScore')}</p>
            <p className="mt-2 font-mono text-4xl text-ice">
              {result.score}
              <span className="ml-2 text-lg text-zinc-500">/ {result.total}</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {tPeakpro(locale, 'quizCorrect').replace('{n}', String(result.correctCount))}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              {result.wrong.length === 0
                ? tPeakpro(locale, 'quizAllRight')
                : `${tPeakpro(locale, 'quizWrong')} ${result.wrong.map((item) => locale === 'zh' ? `第 ${item.index} 題` : `#${item.index}`).join('、')}`}
            </p>
          </div>
          {result.wrong.length > 0 ? (
            <div className="space-y-3">
              <p className="peakpro-kicker">{tPeakpro(locale, 'quizExplain')}</p>
              {result.wrong.map((item) => (
                <article key={`${item.id}-${item.index}`} className="border border-signal/15 px-5 py-4">
                  <p className="text-[11px] text-ice-dim">
                    {locale === 'zh' ? `第 ${item.index} 題` : `Question ${item.index}`}
                  </p>
                  <p className="mt-1 text-sm text-ice">{text(locale, item.prompt)}</p>
                  <p className="mt-3 text-sm text-plasma">
                    {tPeakpro(locale, 'quizYourPick')} {item.picked ? text(locale, item.picked) : tPeakpro(locale, 'quizBlank')}
                  </p>
                  <p className="mt-1 text-sm text-signal">
                    {tPeakpro(locale, 'quizAnswer')} {text(locale, item.correct)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{text(locale, item.explain)}</p>
                </article>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void start()}
            disabled={pending || blocked}
            className="peakpro-btn"
          >
            {blocked ? tPeakpro(locale, 'quizLimit') : tPeakpro(locale, 'quizAgain')}
          </button>
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((item, index) => (
            <article key={item.id} className="border border-signal/15 px-5 py-4">
              <p className="peakpro-kicker">
                {index + 1} / 10 · {tPeakpro(locale, categoryKey(item.category))}
              </p>
              <p className="mt-2 text-sm text-ice">{text(locale, item.prompt)}</p>
              <div className="mt-3 space-y-2">
                {item.choices.map((choice, choiceIndex) => {
                  const selected = answers[item.id] === choiceIndex;
                  return (
                    <button
                      key={`${item.id}-${choiceIndex}`}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: choiceIndex }))}
                      className={cn(
                        'block w-full border px-4 py-2.5 text-left text-sm transition-colors',
                        selected
                          ? 'border-signal bg-signal/10 text-ice'
                          : 'border-signal/10 text-zinc-300',
                      )}
                    >
                      {text(locale, choice)}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            className="peakpro-btn"
          >
            {tPeakpro(locale, 'quizSubmit')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={pending || blocked}
          className="peakpro-btn"
        >
          {blocked ? tPeakpro(locale, 'quizLimit') : tPeakpro(locale, 'quizStart')}
        </button>
      )}
    </section>
  );
}
