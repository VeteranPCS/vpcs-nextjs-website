import 'server-only';
import { checkBotId } from 'botid/server';
import { isTrustedInternalCall, type InternalCallOptions } from '@/lib/internal-call-token';
import { logError } from '@/services/loggingService';

/**
 * Result of classifying a lead-form submission.
 *
 * `botSuspected` is the only field callers branch on; `reason` is for logging/telemetry.
 */
export interface FormBotResult {
  botSuspected: boolean;
  reason: string;
}

/**
 * Centralized bot decision for all lead-capture server actions.
 *
 * This is the single source of truth so every form behaves identically. The order of the
 * short-circuits matters:
 *  1. Trusted server-internal callers (the AI concierge lead tools, which import the form
 *     functions directly server-to-server) hold a process-local token and are never blocked.
 *  2. `BOTID_FORMS_ENFORCED === '0'` is an instant kill-switch — flip the env var to disable
 *     quarantine without a redeploy if BotID ever misfires in production.
 *  3. Otherwise we ask Vercel BotID. Any infra/parse error fails OPEN (never a bot) and is
 *     logged loudly, because losing a real lead is worse than letting a bot through — the
 *     downstream quarantine (tag + suppress SMS), not a hard reject, is the safety net.
 */
export async function checkFormBot(options?: InternalCallOptions): Promise<FormBotResult> {
  if (isTrustedInternalCall(options)) return { botSuspected: false, reason: 'internal' };
  if (process.env.BOTID_FORMS_ENFORCED === '0') return { botSuspected: false, reason: 'disabled' };
  try {
    const v = await checkBotId();
    return { botSuspected: v.isBot, reason: v.isBot ? 'bot' : 'human' };
  } catch (err) {
    logError('checkBotId failed in form action — failing open', undefined, err);
    return { botSuspected: false, reason: 'check-error' };
  }
}

/**
 * Prepends the quarantine marker to a form's free-text field so bot-suspected leads are
 * visibly tagged in Salesforce (the team filters on `[BOT-SUSPECTED]`). Safe on an empty
 * or whitespace-only field — it returns the bare tag in that case.
 */
export function tagBotSuspected(comments: string | undefined): string {
  const tag = '[BOT-SUSPECTED]';
  return comments && comments.trim() ? `${tag} ${comments}` : tag;
}
