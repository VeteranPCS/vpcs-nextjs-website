import {
  convertToModelMessages,
  streamText,
  stepCountIs,
} from 'ai';
import { checkBotId } from 'botid/server';
import { buildTools } from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { parseChatRequest } from '@/lib/ai/chat-validation';
import { MODELS } from '@/lib/ai/models';
import { getOrCreateSessionId } from '@/lib/ai/session';
import { featureFlags } from '@/lib/feature-flags';
import { chatLimiter } from '@/lib/rate-limit';
import { logError } from '@/services/loggingService';

export const runtime = 'nodejs';
export const maxDuration = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'anonymous';
}

export async function POST(req: Request) {
  if (!featureFlags.conciergeEnabled) {
    return new Response('Not found', { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (error) {
    logError('Concierge: failed to parse request body', undefined, error);
    return new Response('Invalid request', { status: 400 });
  }

  const parsed = parseChatRequest(raw);
  if (!parsed.ok) {
    logError('Concierge: invalid request body', { reason: parsed.error });
    return new Response('Invalid request', { status: 400 });
  }
  const { messages, pageContext } = parsed.data;

  const verification = await checkBotId();
  if (verification.isBot) {
    return new Response('Unauthorized', { status: 401 });
  }

  const limit = await chatLimiter.limit(clientIp(req));
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const [{ sessionId }, modelMessages] = await Promise.all([
    getOrCreateSessionId(),
    convertToModelMessages(messages),
  ]);

  try {
    const result = streamText({
      model: MODELS.chat,
      system: buildSystemPrompt(pageContext),
      messages: modelMessages,
      tools: buildTools(),
      stopWhen: stepCountIs(12),
      experimental_telemetry: { isEnabled: false },
    });

    return result.toUIMessageStreamResponse({
      headers: { 'X-Session-Id': sessionId },
    });
  } catch (error) {
    logError('Concierge: streamText failed', { sessionId }, error);
    return new Response(
      JSON.stringify({ error: 'Concierge is temporarily unavailable.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
