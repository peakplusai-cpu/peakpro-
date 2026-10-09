import { getAppOrigin } from '@/lib/env';

export function getAdvisorModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL?.trim() || 'openai/gpt-4o-mini';
}

export function getOpenRouterApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY?.trim() || null;
}

type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

function advisorModels(): string[] {
  const primary = getAdvisorModel();
  return [...new Set([primary, 'openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'])];
}

function connectSignal(userSignal?: AbortSignal, deadline?: AbortSignal): AbortSignal {
  const signals = [userSignal, deadline].filter((row): row is AbortSignal => Boolean(row));
  if (signals.length === 0) return AbortSignal.timeout(18_000);
  if (signals.length === 1) return signals[0];
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  return signals[0];
}

function closeStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
) {
  try {
    controller.close();
  } catch {
    // already closed
  }
  void reader.cancel().catch(() => undefined);
}

export async function streamOpenRouterText(
  messages: ChatTurn[],
  signal?: AbortSignal,
): Promise<{ stream: ReadableStream<Uint8Array> } | { error: string; status: number }> {
  const key = getOpenRouterApiKey();
  if (!key) return { error: 'ai_offline', status: 503 };

  const models = advisorModels();
  const deadline = AbortSignal.timeout(18_000);
  let response: Response | null = null;
  let lastStatus = 502;
  for (const model of models) {
    if (deadline.aborted || signal?.aborted) break;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: connectSignal(signal, deadline),
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getAppOrigin(),
          'X-Title': 'PeakPro+',
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.7,
          max_tokens: 700,
          messages,
        }),
        cache: 'no-store',
      });
    } catch (error) {
      console.warn('[peakpro/advisor] OpenRouter connect failed', model, error);
      response = null;
      continue;
    }
    if (response.ok && response.body) break;
    lastStatus = response.status;
    const body = await response.text().catch(() => '');
    console.warn('[peakpro/advisor] OpenRouter HTTP', model, response.status, body.slice(0, 400));
    response = null;
  }

  if (!response?.ok || !response.body) {
    return { error: 'ai_failed', status: lastStatus || 502 };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) {
        closeStream(controller, reader);
        return;
      }

      const emitLine = (raw: string): boolean => {
        const line = raw.trim();
        if (!line.startsWith('data:')) return false;
        const data = line.slice(5).trim();
        if (!data) return false;
        if (data === '[DONE]') return true;
        try {
          const json = JSON.parse(data) as {
            error?: { message?: string };
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          };
          if (json.error) {
            console.warn('[peakpro/advisor] OpenRouter stream error', json.error.message);
            return true;
          }
          const token = json.choices?.[0]?.delta?.content;
          if (token) controller.enqueue(new TextEncoder().encode(token));
          const reason = json.choices?.[0]?.finish_reason;
          if (reason && reason !== 'error') return true;
          if (reason === 'error') return true;
        } catch {
          // ignore partial JSON
        }
        return false;
      };

      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) emitLine(buffer);
        finished = true;
        closeStream(controller, reader);
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n');
      buffer = chunks.pop() ?? '';
      for (const raw of chunks) {
        if (emitLine(raw)) {
          finished = true;
          closeStream(controller, reader);
          return;
        }
      }
    },
    cancel() {
      finished = true;
      void reader.cancel().catch(() => undefined);
    },
  });

  return { stream };
}
