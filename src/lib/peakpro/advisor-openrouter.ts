import { getAppOrigin } from '@/lib/env';

export function getAdvisorModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL?.trim() || 'openai/gpt-4o-mini';
}

export function getOpenRouterApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY?.trim() || null;
}

type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

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

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': getAppOrigin(),
      'X-Title': 'PeakPro+',
    },
    body: JSON.stringify({
      model: getAdvisorModel(),
      stream: true,
      temperature: 0.7,
      max_tokens: 1200,
      messages,
    }),
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    console.warn('[peakpro/advisor] OpenRouter HTTP', response.status, body.slice(0, 400));
    return { error: 'ai_failed', status: 502 };
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
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          };
          const token = json.choices?.[0]?.delta?.content;
          if (token) controller.enqueue(new TextEncoder().encode(token));
          if (json.choices?.[0]?.finish_reason) return true;
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
