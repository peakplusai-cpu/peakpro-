import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { getOpenRouterApiKey, streamOpenRouterText } from '@/lib/peakpro/advisor-openrouter';
import { liveContextOrFallback, settleWithTimeout } from '@/lib/peakpro/advisor-live';
import { ADVISOR_SYSTEM_PROMPT, buildAdvisorDeskContext } from '@/lib/peakpro/advisor-prompt';
import { consumeAdvisorQuota, readAdvisorQuota } from '@/lib/peakpro/advisor-quota';
import { ADVISOR_MAX_HISTORY, ADVISOR_MAX_INPUT } from '@/lib/peakpro/constants';
import { readPeakProCache } from '@/lib/peakpro/cache';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { formatAdvisorTape } from '@/lib/peakpro/tape';
import { loadTapeDesk } from '@/lib/peakpro/tape-store';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type IncomingTurn = { role?: unknown; content?: unknown };

function sanitizeHistory(input: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const row of input as IncomingTurn[]) {
    const role = row?.role === 'assistant' ? 'assistant' : row?.role === 'user' ? 'user' : null;
    const content = typeof row?.content === 'string' ? row.content.trim() : '';
    if (!role || !content) continue;
    turns.push({ role, content: content.slice(0, ADVISOR_MAX_INPUT) });
  }
  return turns.slice(-ADVISOR_MAX_HISTORY);
}

async function tapeContextOrFallback(userId: string, cacheEquities: Awaited<ReturnType<typeof readPeakProCache>>['equities']) {
  try {
    const admin = createAdminClient();
    const { data: lots } = await admin.from('peakpro_lots').select('symbol,book').eq('user_id', userId);
    const bookSymbols = ((lots ?? []) as Array<{ symbol?: string; book?: string }>)
      .filter((row) => row.book === 'taiwan' || row.book === 'us')
      .map((row) => String(row.symbol ?? ''))
      .filter(Boolean);
    const tape = await loadTapeDesk({ bookSymbols, dailyRows: cacheEquities });
    return formatAdvisorTape(tape.desk);
  } catch (error) {
    console.warn('[peakpro/advisor] tape context skipped', error);
    return 'SESSION_TAPE: unavailable this turn';
  }
}

export async function GET() {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const quota = await readAdvisorQuota(user.id);
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    ...quota,
  });
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthUser();
    if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });

    const session = await loadPeakProSession(user.id, user.email ?? null);
    if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

    const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
    const history = sanitizeHistory(body?.messages);
    const last = history.at(-1);
    if (!last || last.role !== 'user') {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    if (last.content.length > ADVISOR_MAX_INPUT) {
      return NextResponse.json({ error: 'too_long' }, { status: 400 });
    }
    if (!getOpenRouterApiKey()) {
      return NextResponse.json({ error: 'ai_offline' }, { status: 503 });
    }

    const quotaNow = await readAdvisorQuota(user.id);
    if (quotaNow.ready && (quotaNow.remaining ?? 0) <= 0) {
      return NextResponse.json({ error: 'limit', ...quotaNow }, { status: 429 });
    }

    const cache = await readPeakProCache();
    const desk = buildAdvisorDeskContext(cache);
    const [live, tapeBlock] = await Promise.all([
      liveContextOrFallback(last.content, 2_500),
      settleWithTimeout(
        tapeContextOrFallback(user.id, cache.equities),
        2_000,
        'SESSION_TAPE: skipped this turn',
      ),
    ]);

    const upstream = await streamOpenRouterText(
      [
        {
          role: 'system',
          content: `${ADVISOR_SYSTEM_PROMPT}\n\nLIVE_DESK:\n${live}\n\n${tapeBlock}\n\nCACHED_DESK:\n${desk}`,
        },
        ...history,
      ],
      request.signal,
    );

    if ('error' in upstream) {
      return NextResponse.json({ error: upstream.error }, { status: upstream.status });
    }

    const quota = await consumeAdvisorQuota(user.id);
    if (!quota.ok) {
      return NextResponse.json({ error: 'limit', ...quota }, { status: 429 });
    }

    return new Response(upstream.stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'X-Advisor-Used': String(quota.used),
        'X-Advisor-Limit': String(quota.limit),
        'X-Advisor-Remaining': quota.remaining == null ? '' : String(quota.remaining),
        'X-Advisor-Quota-Ready': quota.ready ? '1' : '0',
      },
    });
  } catch (error) {
    console.warn('[peakpro/advisor] turn failed', error);
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 });
  }
}
