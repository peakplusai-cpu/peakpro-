'use client';

import { useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { PeakProLearnQuiz } from '@/components/peakpro/learn-quiz';
import { learnLessons, type LearnLesson, type LearnTab } from '@/lib/peakpro/learn';
import { cn } from '@/lib/utils';

function LessonCard({ locale, lesson }: { locale: Locale; lesson: LearnLesson }) {
  const title = locale === 'zh' ? lesson.title.zh : lesson.title.en;
  const body = locale === 'zh' ? lesson.body.zh : lesson.body.en;
  return (
    <article id={lesson.id} className="scroll-mt-28 rounded-3xl border border-gold/15 bg-black/60 px-6 py-6">
      <h3 className="font-peakpro text-xl text-gold">{title}</h3>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

export function PeakProLearnDesk({ locale }: { locale: Locale }) {
  const [tab, setTab] = useState<LearnTab>('principles');
  const lessons = learnLessons(tab);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'learnTitle')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'learnLead')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['principles', 'indicators'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs tracking-wide',
              tab === id ? 'bg-gold text-black' : 'border border-gold/25 text-zinc-400 hover:text-gold',
            )}
          >
            {tPeakpro(locale, id === 'principles' ? 'learnPrinciples' : 'learnIndicators')}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-gold">{tPeakpro(locale, 'learnToc')}</p>
          <ol className="space-y-1">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <a
                  href={`#${lesson.id}`}
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-gold/10 hover:text-gold"
                >
                  <span className="mr-2 text-[10px] text-gold-antique">{String(index + 1).padStart(2, '0')}</span>
                  {locale === 'zh' ? lesson.title.zh : lesson.title.en}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} locale={locale} lesson={lesson} />
          ))}
        </div>
      </div>

      <PeakProLearnQuiz locale={locale} />

      <p className="text-[11px] leading-relaxed text-zinc-600">
        {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
      </p>
    </div>
  );
}
