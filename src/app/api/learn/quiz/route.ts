import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { gradeQuiz, readQuizToken, startQuiz } from '@/lib/peakpro/learn-quiz';
import { consumeQuizQuota, readQuizQuota } from '@/lib/peakpro/learn-quiz-quota';
import { loadPeakProSession } from '@/lib/peakpro/profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  await loadPeakProSession(user.id, user.email ?? null);
  const quota = await readQuizQuota(user.id);
  return NextResponse.json({ ok: true, ...quota });
}

export async function POST(request: Request) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  await loadPeakProSession(user.id, user.email ?? null);

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    token?: unknown;
    answers?: unknown;
  } | null;
  const action = body?.action === 'submit' ? 'submit' : 'start';

  if (action === 'start') {
    const quota = await consumeQuizQuota(user.id);
    if (!quota.ok) return NextResponse.json({ error: 'limit', ...quota }, { status: 429 });
    const pack = startQuiz(user.id);
    return NextResponse.json({
      ok: true,
      used: quota.used,
      remaining: quota.remaining,
      limit: quota.limit,
      ready: quota.ready,
      token: pack.token,
      questions: pack.questions,
    });
  }

  const token = typeof body?.token === 'string' ? body.token : '';
  const payload = readQuizToken(token);
  if (!payload || payload.u !== user.id) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }
  const raw = body?.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {};
  const answers: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n <= 3) answers[id] = n;
  }
  const result = gradeQuiz(payload, answers);
  const quota = await readQuizQuota(user.id);
  return NextResponse.json({
    ok: true,
    used: quota.used,
    remaining: quota.remaining,
    limit: quota.limit,
    score: result.score,
    total: result.total,
    correctCount: result.correctCount,
    wrong: result.wrong,
  });
}
