import { createHmac, timingSafeEqual } from 'crypto';

export interface CreemWebhookEntity {
  id?: string;
  object?: string;
  status?: string;
  email?: string;
  last_transaction_id?: string | null;
  product?: string | { id?: string };
  customer?: string | { id?: string; email?: string };
  subscription?: string | CreemWebhookEntity;
  order?: string | CreemWebhookEntity;
  metadata?: Record<string, unknown> | null;
}

export interface CreemWebhookPayload {
  id: string;
  eventType: string;
  created_at?: number;
  object: CreemWebhookEntity;
}

export function getCreemApiBase(): string {
  return process.env.CREEM_TEST_MODE?.trim().toLowerCase() === 'true'
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io';
}

export function getCreemApiKey(): string | null {
  return process.env.CREEM_API_KEY?.trim() || null;
}

export function getCreemWebhookSecret(): string | null {
  return process.env.CREEM_WEBHOOK_SECRET?.trim() || null;
}

export function verifyCreemSignature(rawBody: string, signature: string | null): boolean {
  const secret = getCreemWebhookSecret();
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function parseCreemWebhook(rawBody: string): CreemWebhookPayload | null {
  try {
    const payload = JSON.parse(rawBody) as Partial<CreemWebhookPayload>;
    if (
      typeof payload.id !== 'string' ||
      typeof payload.eventType !== 'string' ||
      !payload.object ||
      typeof payload.object !== 'object'
    ) {
      return null;
    }
    return payload as CreemWebhookPayload;
  } catch {
    return null;
  }
}

export function resolveEntityId(
  value: string | { id?: string } | null | undefined,
): string | null {
  if (typeof value === 'string') return value;
  return value?.id?.trim() || null;
}

export function resolveCreemProductId(object: CreemWebhookEntity): string | null {
  return (
    resolveEntityId(object.product) ??
    (typeof object.subscription === 'object'
      ? resolveEntityId(object.subscription.product)
      : null) ??
    (typeof object.order === 'object' ? resolveEntityId(object.order.product) : null)
  );
}

export function resolveCreemCustomer(object: CreemWebhookEntity): {
  id: string | null;
  email: string | null;
} {
  const candidates = [
    object.customer,
    typeof object.subscription === 'object' ? object.subscription.customer : null,
    typeof object.order === 'object' ? object.order.customer : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') return { id: candidate, email: null };
    if (candidate?.id || candidate?.email) {
      return {
        id: candidate.id?.trim() || null,
        email: candidate.email?.trim().toLowerCase() || null,
      };
    }
  }

  return { id: null, email: object.email?.trim().toLowerCase() || null };
}

export function resolveCreemMetadata(object: CreemWebhookEntity): Record<string, unknown> {
  if (object.metadata) return object.metadata;
  if (typeof object.subscription === 'object' && object.subscription.metadata) {
    return object.subscription.metadata;
  }
  if (typeof object.order === 'object' && object.order.metadata) {
    return object.order.metadata;
  }
  return {};
}
