import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import {
  getCreemApiBase,
  getCreemApiKey,
  parseCreemWebhook,
  resolveCreemCustomer,
  resolveCreemMetadata,
  resolveCreemProductId,
  resolveEntityId,
  type CreemWebhookEntity,
} from '@/lib/creem';
import { getAppOrigin } from '@/lib/env';
import {
  activatePeakProPremium,
  findPeakProProfile,
  revokePeakProPremium,
} from '@/lib/peakpro/profile';

const ACTIVATE_EVENTS = new Set([
  'checkout.completed',
  'subscription.paid',
  'payment_intent.succeeded',
  'invoice.paid',
]);

const REVOKE_EVENTS = new Set([
  'subscription.expired',
  'subscription.paused',
  'subscription.unpaid',
  'subscription.canceled',
  'invoice.payment_failed',
  'charge.failed',
]);

export function getPeakProProductId(): string | null {
  return (
    process.env.CREEM_PRODUCT_ID?.trim() ||
    process.env.CREEM_PEAKPRO_PRODUCT_ID?.trim() ||
    null
  );
}

export function getPeakProSuccessUrl(origin?: string): string {
  return `${(origin || getAppOrigin()).replace(/\/$/, '')}/app?payment=success`;
}

export async function createPeakProCheckoutUrl(input: {
  userId: string;
  email?: string;
  origin?: string;
}): Promise<{ url: string | null; missing: string[]; error?: string }> {
  const apiKey = getCreemApiKey();
  const productId = getPeakProProductId();
  const missing = [
    ...(!apiKey ? ['CREEM_API_KEY'] : []),
    ...(!productId ? ['CREEM_PRODUCT_ID'] : []),
  ];
  if (!apiKey || !productId) return { url: null, missing };

  const response = await fetch(`${getCreemApiBase()}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      product_id: productId,
      request_id: randomUUID(),
      customer: input.email ? { email: input.email } : undefined,
      success_url: getPeakProSuccessUrl(input.origin),
      metadata: {
        peakpro_user_id: input.userId,
        checkout_product: 'peakpro',
      },
    }),
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { checkout_url?: string; message?: string; error?: string }
    | null;

  if (!response.ok || !json?.checkout_url) {
    return {
      url: null,
      missing: [],
      error: json?.message ?? json?.error ?? `Creem API returned HTTP ${response.status}`,
    };
  }
  return { url: json.checkout_url, missing: [] };
}

function isPeakProPayload(object: CreemWebhookEntity): boolean {
  const metadata = resolveCreemMetadata(object);
  if (metadata.checkout_product === 'peakpro') return true;
  if (typeof metadata.peakpro_user_id === 'string' && metadata.peakpro_user_id.trim()) {
    return true;
  }
  const productId = resolveCreemProductId(object);
  const configured = getPeakProProductId();
  return Boolean(configured && productId && productId === configured);
}

export function shouldHandlePeakProWebhook(rawBody: string): boolean {
  const payload = parseCreemWebhook(rawBody);
  if (!payload) return false;
  return isPeakProPayload(payload.object);
}

export async function handlePeakProCreemWebhook(
  rawBody: string,
): Promise<NextResponse | null> {
  const payload = parseCreemWebhook(rawBody);
  if (!payload || !isPeakProPayload(payload.object)) return null;

  const metadata = resolveCreemMetadata(payload.object);
  const userId =
    typeof metadata.peakpro_user_id === 'string' ? metadata.peakpro_user_id.trim() : null;
  const customer = resolveCreemCustomer(payload.object);
  const subscriptionId =
    payload.object.object === 'subscription'
      ? payload.object.id?.trim() || null
      : resolveEntityId(payload.object.subscription);
  const transactionId =
    typeof payload.object.last_transaction_id === 'string'
      ? payload.object.last_transaction_id
      : null;

  const profile = await findPeakProProfile({
    userId,
    email: customer.email,
    customerId: customer.id,
    subscriptionId,
  });

  if (ACTIVATE_EVENTS.has(payload.eventType)) {
    const targetId = userId ?? profile?.id;
    if (!targetId) {
      return NextResponse.json(
        { error: 'No PeakPro+ account matches this Creem customer.' },
        { status: 404 },
      );
    }
    const updated = await activatePeakProPremium({
      userId: targetId,
      email: customer.email ?? profile?.email,
      customerId: customer.id,
      subscriptionId,
      transactionId,
    });
    return NextResponse.json({
      received: true,
      product: 'peakpro',
      action: 'activate',
      user_id: updated?.id ?? targetId,
      tier: 'premium',
      expires_at: updated?.expires_at ?? null,
    });
  }

  if (REVOKE_EVENTS.has(payload.eventType)) {
    const updated = await revokePeakProPremium({
      userId: userId ?? profile?.id,
      subscriptionId,
      customerId: customer.id,
      reason: payload.eventType,
    });
    return NextResponse.json({
      received: true,
      product: 'peakpro',
      action: 'revoke',
      user_id: updated?.id ?? null,
      tier: 'free',
      redirect: '/subscribe?revoked=1',
    });
  }

  return NextResponse.json({ received: true, product: 'peakpro', skipped: true });
}
