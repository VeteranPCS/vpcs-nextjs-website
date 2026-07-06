import {
  convertToModelMessages,
  streamText,
} from 'ai';
import { checkBotId } from 'botid/server';
import {
  buildConciergeConfig,
  extractAllUserText,
  extractAllAssistantText,
} from '@/lib/ai/run-concierge';
import { parseChatRequest, stripAssistantMessageParts } from '@/lib/ai/chat-validation';
import { getOrCreateSessionId } from '@/lib/ai/session';
import { featureFlags } from '@/lib/feature-flags';
import { chatLimiter, chatIpLimiter } from '@/lib/rate-limit';
import { callerIp } from '@/lib/spam-protection';
import { evaluateInput } from '@/lib/ai/guardrails';
import { runHeuristics } from '@/lib/ai/guardrails/heuristics';
import { buildBlockedResponse } from '@/lib/ai/guardrails/responses';
import { addSessionTokens } from '@/lib/ai/guardrails/budget';
import { guardrailsEnforced, REFUSAL_MESSAGE } from '@/lib/ai/guardrails/config';
import { logError } from '@/services/loggingService';
import { captureServerAnalyticsEvent } from '@/lib/analytics/server';
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
  const ip = await callerIp();

  const headerVisitorId = req.headers.get('x-vpcs-visitor-id')?.trim();

  // Rate-limit on BOTH the session bucket AND the IP bucket. The session bucket is
  // keyed by the client-droppable cookie; without the IP bucket a caller resets the
  // limit just by clearing the cookie. Fail if EITHER bucket is exhausted.
  const [sessionLimit, ipLimit] = await Promise.all([
    chatLimiter.limit(sessionId),
    chatIpLimiter.limit(ip),
  ]);
  if (!sessionLimit.success || !ipLimit.success) {
    const reset = Math.max(sessionLimit.reset, ipLimit.reset);
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
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
  const { messages, pageContext, analyticsContext } = parsed.data;
  const visitorId =
    (typeof analyticsContext?.vpcs_visitor_id === 'string' && analyticsContext.vpcs_visitor_id)
    || (headerVisitorId?.startsWith('vpcs_') ? headerVisitorId : undefined)
    || sessionId;

  // Pull the text of every user AND assistant turn first. Malformed `parts` (e.g. a
  // client sending a non-array) throws here and is caught as a 400 — rather than
  // later surfacing as an unhandled 500 from convertToModelMessages. Assistant turns
  // are client-controlled (useChat resends the cookie-scoped transcript), so they
  // must be scanned too — see the Tier-0 loop below.
  let userTurns: string[];
  let assistantTurns: string[];
  try {
    userTurns = extractAllUserText(messages);
    assistantTurns = extractAllAssistantText(messages);
  } catch (error) {
    logError('Concierge: failed to read message text', undefined, error);
    return new Response('Invalid request', { status: 400 });
  }

  // Tier-0 heuristics scan EVERY user turn AND every assistant turn, not just the
  // latest, so a multi-turn injection can't smuggle its payload into an earlier
  // message — and a client can't forge an assistant turn that carries a jailbreak
  // the model would continue from. Honors the kill-switch so GUARDRAILS_ENFORCED=0
  // disables this pass too.
  if (guardrailsEnforced()) {
    // User turns get the full check, including the MAX_INPUT_CHARS size cap that bounds
    // per-message token cost.
    for (const turn of userTurns) {
      if (runHeuristics(turn)?.action === 'block') {
        return buildBlockedResponse(REFUSAL_MESSAGE, sessionId);
      }
    }
    // Assistant turns are scanned for injection signatures only. The size cap must NOT
    // apply here: the model legitimately produces replies longer than MAX_INPUT_CHARS,
    // and useChat resends the prior assistant turn on the next request — capping it
    // would give an otherwise-valid follow-up the generic guardrail refusal before the
    // model runs (Codex P2).
    for (const turn of assistantTurns) {
      if (runHeuristics(turn, { enforceSizeLimit: false })?.action === 'block') {
        return buildBlockedResponse(REFUSAL_MESSAGE, sessionId);
      }
    }
  }

  // Tier-1 classifier (+ token budget) inspects the latest user input only. Passing
  // `ip` makes the budget cookie-drop-proof: it's checked against both the session
  // and the IP bucket BEFORE the model runs.
  // Intentionally outside the try-block: evaluateInput fails open at every leaf, so it
  // never throws; a block must reach buildBlockedResponse, not the catch's 500 handler.
  const decision = await evaluateInput(userTurns.at(-1) ?? '', { sessionId, ip });
  if (decision.action === 'block') {
    return buildBlockedResponse(REFUSAL_MESSAGE, sessionId);
  }

  try {
    // Strip assistant turns to plain text before the model sees them: the resent
    // transcript is client-controlled, so any forged tool-call / tool-result / file
    // parts are dropped and can't feed fabricated data back into the model. This also
    // drops the AI-SDK approval-handshake parts, so a forged `approval-responded` can't
    // execute a needsApproval lead-submit tool without genuine consent — which means
    // HITL lead submission is intentionally disabled until server-held/signed history
    // lands (see stripAssistantMessageParts for the full rationale).
    // TODO(security): the durable fix is server-held / signed history so the client
    // can't author assistant turns at all (out of scope for Phase 2 — memory is
    // cookie-scoped). This strip + the Tier-0 assistant scan are the interim
    // mitigation for remediation item 2.3.
    const modelMessages = await convertToModelMessages(stripAssistantMessageParts(messages));
    const sourcePagePath = typeof analyticsContext?.source_page_path === 'string'
      ? analyticsContext.source_page_path
      : undefined;
    const config = buildConciergeConfig({
      pageContext,
      analyticsContext: {
        ...analyticsContext,
        vpcs_visitor_id: visitorId,
      },
    });
    const result = streamText({
      ...config,
      messages: modelMessages,
      experimental_telemetry: { isEnabled: false },
      onFinish: async ({ usage, totalUsage }) => {
        const tokens = totalUsage?.totalTokens ?? usage?.totalTokens ?? 0;
        // Increment BOTH the session and IP token tallies so the IP budget is a real
        // ceiling that a cookie drop can't reset (mirrors the dual budget check above).
        await Promise.all([
          addSessionTokens(sessionId, tokens),
          addSessionTokens(ip, tokens),
        ]);
        await captureServerAnalyticsEvent({
          event: 'concierge_chat_completed',
          distinctId: visitorId,
          properties: {
            vpcs_visitor_id: visitorId,
            source_page_path: sourcePagePath,
            tokens_used: tokens,
          },
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
