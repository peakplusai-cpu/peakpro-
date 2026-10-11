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
import { TRIAL_DAYS } from '@/lib/peakpro/constants';
import {
  activatePeakProPremium,
  findPeakProProfile,
  revokePeakProPremium,
} from '@/lib/peakpro/profile';
import { claimTrialGrant, sealTrialGrant } from '@/lib/peakpro/trial';

const ACTIVATE_EVENTS = new Set([
  'checkout.completed',
  'subscription.paid',
  'subscription.trialing',
  'subscription.active',
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

const CREEM_API_HOSTS = ['https://api.creem.io', 'https://test-api.creem.io'] as const;

function normalizeProductId(value: string | null): string | null {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  return trimmed || null;
}

function creemErrorMessage(json: unknown, status: number): string {
  if (!json || typeof json !== 'object') return `Creem API returned HTTP ${status}`;
  const body = json as {
    message?: string;
    error?: string | { message?: string };
    errors?: Array<{ message?: string }>;
  };
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (body.error && typeof body.error === 'object' && body.error.message) return body.error.message;
  if (body.errors?.[0]?.message) return body.errors[0].message;
  return `Creem API returned HTTP ${status}`;
}

function isProductMissing(message: string): boolean {
  return /product not found|product_not_found|invalid product/i.test(message);
}

export function getPeakProProductId(): string | null {
  return normalizeProductId(
    process.env.CREEM_PRODUCT_ID?.trim() || process.env.CREEM_PEAKPRO_PRODUCT_ID?.trim() || null,
  );
}

export function getPeakProSuccessUrl(origin?: string): string {
  return `${(origin || getAppOrigin()).replace(/\/$/, '')}/app?payment=success`;
}

let productTrialReady = false;

async function ensureCreemProductTrial(host: string, apiKey: string, productId: string) {
  if (productTrialReady) return;
  try {
    const current = await fetch(`${host}/v1/products/${productId}`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    const json = (await current.json().catch(() => null)) as {
      trial_period_days?: number | null;
      trial_price?: number | null;
    } | null;
    const freeSeven =
      json?.trial_period_days === TRIAL_DAYS && (json.trial_price == null || json.trial_price === 0);
    if (current.ok && freeSeven) {
      productTrialReady = true;
      return;
    }

    const patched = await fetch(`${host}/v1/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ trial_period_days: TRIAL_DAYS, trial_price: 0 }),
      cache: 'no-store',
    });
    if (patched.ok) productTrialReady = true;
    else console.warn('[peakpro/creem] could not enable 7-day product trial', patched.status);
  } catch (error) {
    console.warn('[peakpro/creem] product trial probe failed', error);
  }
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

  const preferred = getCreemApiBase();
  const hosts = [preferred, ...CREEM_API_HOSTS.filter((host) => host !== preferred)];
  let lastError = 'Creem checkout could not be created.';

  for (const host of hosts) {
    await ensureCreemProductTrial(host, apiKey, productId);
    const response = await fetch(`${host}/v1/checkouts`, {
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

    const json = (await response.json().catch(() => null)) as { checkout_url?: string } | null;
    if (response.ok && json?.checkout_url) return { url: json.checkout_url, missing: [] };

    lastError = `${creemErrorMessage(json, response.status)} (${host} / ${productId})`;
    if (!isProductMissing(lastError)) break;
  }

  return { url: null, missing: [], error: lastError };
}

export async function createPeakProPortalUrl(customerId: string): Promise<{
  url: string | null;
  missing: string[];
  error?: string;
}> {
  const apiKey = getCreemApiKey();
  if (!apiKey) return { url: null, missing: ['CREEM_API_KEY'] };

  const preferred = getCreemApiBase();
  const hosts = [preferred, ...CREEM_API_HOSTS.filter((host) => host !== preferred)];
  let lastError = 'Creem billing portal could not be opened.';

  for (const host of hosts) {
    const response = await fetch(`${host}/v1/customers/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ customer_id: customerId }),
      cache: 'no-store',
    });
    const json = (await response.json().catch(() => null)) as { customer_portal_link?: string } | null;
    if (response.ok && json?.customer_portal_link) {
      return { url: json.customer_portal_link, missing: [] };
    }
    lastError = `${creemErrorMessage(json, response.status)} (${host})`;
  }

  return { url: null, missing: [], error: lastError };
}

export async function cancelPeakProSubscription(subscriptionId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const apiKey = getCreemApiKey();
  if (!apiKey) return { ok: false, error: 'Missing CREEM_API_KEY' };

  const preferred = getCreemApiBase();
  const hosts = [preferred, ...CREEM_API_HOSTS.filter((host) => host !== preferred)];
  let lastError = 'Creem could not cancel this mandate.';

  for (const host of hosts) {
    const response = await fetch(`${host}/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ mode: 'immediate', onExecute: 'cancel' }),
      cache: 'no-store',
    });
    if (response.ok) return { ok: true };
    const json = await response.json().catch(() => null);
    lastError = `${creemErrorMessage(json, response.status)} (${host})`;
  }

  return { ok: false, error: lastError };
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

    const email = customer.email ?? profile?.email ?? null;
    const trialing =
      payload.eventType === 'subscription.trialing' ||
      payload.object.status === 'trialing' ||
      (payload.eventType === 'checkout.completed' && !transactionId);

    if (trialing) {
      const claim = await claimTrialGrant(targetId, email);
      if (claim.status === 'denied') {
        return NextResponse.json({
          received: true,
          product: 'peakpro',
          action: 'trial_denied',
          user_id: targetId,
        });
      }
    } else {
      await sealTrialGrant(targetId, email, null);
    }

    const updated = await activatePeakProPremium({
      userId: targetId,
      email,
      customerId: customer.id,
      subscriptionId,
      transactionId,
      days: trialing ? TRIAL_DAYS : 30,
    });
    return NextResponse.json({
      received: true,
      product: 'peakpro',
      action: trialing ? 'trial' : 'activate',
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
