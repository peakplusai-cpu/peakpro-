import { NextResponse } from 'next/server';

import { requireAuthUser } from '@/lib/auth';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    quantity?: unknown;
    cost?: unknown;
    bought_on?: unknown;
  } | null;

  const patch: Record<string, unknown> = {};
  if (body?.quantity != null) {
    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    patch.quantity = quantity;
  }
  if (body?.cost != null) {
    const cost = Number(body.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    patch.cost = cost;
  }
  if (body?.bought_on !== undefined) {
    if (body.bought_on === null || body.bought_on === '') {
      patch.bought_on = null;
    } else if (typeof body.bought_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.bought_on)) {
      patch.bought_on = body.bought_on;
    } else {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('peakpro_lots').update(patch).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user } = await requireAuthUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.tier !== 'premium') return NextResponse.json({ error: 'premium' }, { status: 403 });

  const { id } = await context.params;
  const admin = createAdminClient();
  const { error } = await admin.from('peakpro_lots').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
