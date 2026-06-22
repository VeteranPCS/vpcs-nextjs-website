import {
  convertToModelMessages,
  streamText,
} from 'ai';
import { checkBotId } from 'botid/server';
import { buildConciergeConfig, extractAllUserText } from '@/lib/ai/run-concierge';
import { parseChatRequest } from '@/lib/ai/chat-validation';
import { getOrCreateSessionId } from '@/lib/ai/session';
import { featureFlags } from '@/lib/feature-flags';
import { chatLimiter } from '@/lib/rate-limit';
import { evaluateInput } from '@/lib/ai/guardrails';
import { runHeuristics } from '@/lib/ai/guardrails/heuristics';
import { buildBlockedResponse } from '@/lib/ai/guardrails/responses';
import { addSessionTokens } from '@/lib/ai/guardrails/budget';
import { guardrailsEnforced, REFUSAL_MESSAGE } from '@/lib/ai/guardrails/config';
import { logError } from '@/services/loggingService';
import { getPostHogClient } from '@/lib/posthog-server';
import {
  deployedConciergeRequiresUpstash,
  missingUpstashEnvVars,
} from '@/lib/upstash-env';

export const runtime = 'nodejs';
export const maxDuration = 60;

function deployedRuntimeRequiresBotId(): boolean {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'development';
}

function hasExpectedBotIdClientHeaders(req: Request): boolean {
  const path = req.headers.get('x-path')?.trim();
  const method = req.headers.get('x-method')?.trim().toUpperCase();
  const challenge = req.headers.get('x-is-human')?.trim();
  return Boolean(challenge && path === new URL(req.url).pathname && method === 'POST');
}

export async function POST(req: Request) {
  if (!featureFlags.conciergeEnabled) {
    return new Response('Not found', { status: 404 });
  }

  if (deployedRuntimeRequiresBotId() && !hasExpectedBotIdClientHeaders(req)) {
    return new Response('Unauthorized', { status: 403 });
  }

  let verification;
  try {
    verification = await checkBotId({
      advancedOptions: { checkLevel: 'deepAnalysis' },
    });
  } catch (error) {
    logError('Concierge: BotID verification failed', undefined, error);
    return new Response('Unauthorized', { status: 401 });
  }

  if (verification.isBot) {
    return new Response('Unauthorized', { status: 401 });
  }

  const missingUpstash = missingUpstashEnvVars();
  if (deployedConciergeRequiresUpstash() && missingUpstash.length > 0) {
    logError('Concierge: Upstash env vars missing in deployed runtime', {
      missingEnv: missingUpstash,
      vercelEnv: process.env.VERCEL_ENV,
    });
    return new Response('Concierge is temporarily unavailable.', { status: 503 });
  }

  const { sessionId } = await getOrCreateSessionId();

  const limit = await chatLimiter.limit(sessionId);
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    });
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

  // Pull the text of every user turn first. Malformed `parts` (e.g. a client
  // sending a non-array) throws here and is caught as a 400 — rather than later
  // surfacing as an unhandled 500 from convertToModelMessages.
  let userTurns: string[];
  try {
    userTurns = extractAllUserText(messages);
  } catch (error) {
    logError('Concierge: failed to read user message text', undefined, error);
    return new Response('Invalid request', { status: 400 });
  }

  // Tier-0 heuristics scan EVERY user turn, not just the latest, so a multi-turn
  // injection can't smuggle its payload into an earlier message. Honors the
  // kill-switch so GUARDRAILS_ENFORCED=0 disables this pass too.
  if (guardrailsEnforced()) {
    for (const turn of userTurns) {
      if (runHeuristics(turn)?.action === 'block') {
        return buildBlockedResponse(REFUSAL_MESSAGE, sessionId);
      }
    }
  }

  // Tier-1 classifier (+ token budget) inspects the latest user input only.
  // Intentionally outside the try-block: evaluateInput fails open at every leaf, so it
  // never throws; a block must reach buildBlockedResponse, not the catch's 500 handler.
  const decision = await evaluateInput(userTurns.at(-1) ?? '', { sessionId });
  if (decision.action === 'block') {
    return buildBlockedResponse(REFUSAL_MESSAGE, sessionId);
  }

  try {
    const modelMessages = await convertToModelMessages(messages);
    const config = buildConciergeConfig({ pageContext });
    const result = streamText({
      ...config,
      messages: modelMessages,
      experimental_telemetry: { isEnabled: false },
      onFinish: async ({ usage, totalUsage }) => {
        const tokens = totalUsage?.totalTokens ?? usage?.totalTokens ?? 0;
        await addSessionTokens(sessionId, tokens);
        const phog = getPostHogClient();
        phog.capture({
          distinctId: sessionId,
          event: 'concierge_chat_completed',
          properties: { tokens_used: tokens },
        });
      },
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
