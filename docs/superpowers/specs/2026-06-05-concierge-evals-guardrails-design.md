# Concierge Evals & Runtime Guardrails — Design

- **Date:** 2026-06-05
- **Status:** Approved design, pre-implementation
- **Branch:** `ai/concierge-evals-guardrails`
- **Owner:** Harper (VeteranPCS) + Claude (Opus 4.8)

## 1. Problem & current state

The Phase 2 AI concierge (`/api/chat`) ships with perimeter defenses (feature flag, request validation, BotID, Upstash IP rate-limit, `stepCountIs(12)`) but **nothing inspects what the user actually types**, there is **no per-session spend cap**, and **no test proves the model behaves**. We need two things, organized around the OWASP LLM Top 10:

1. **Runtime guardrails** against input-side abuse.
2. **An eval harness** that proves both model quality and guardrail effectiveness.

Where the concierge stands today against OWASP LLM Top 10 (verified against live code):

| OWASP risk | Current state | Verdict |
|---|---|---|
| LLM01 Prompt Injection | Message *roles* validated (`messageSchema` rejects client `system` role); message *bodies* uninspected. pageContext labeled untrusted. | **Gap — no content inspection** |
| LLM02 Sensitive Info Disclosure | Tools are state-scoped reads; no PII-bearing free queries; SF token never in prompt. | Low, untested |
| LLM05 Improper Output Handling | `MessageRenderer` renders plain React text — no `dangerouslySetInnerHTML`/markdown sink. | **Already safe** |
| LLM06 Excessive Agency | All 4 `submit*` tools set `needsApproval: true` + `ApprovalCard` Approve/Decline UI. Lead write cannot fire without a click. | **Already gated** |
| LLM07 System Prompt Leakage | No secrets in prompt; no explicit refusal-to-disclose. | Low |
| LLM09 Misinformation | Prompt forbids inventing agents/lenders/BAH; unproven. | **Untested** |
| LLM10 Unbounded Consumption | `stepCountIs(12)` + IP rate-limit + `maxDuration=60`. No per-session token/cost budget; no topical scoping. | **Partial — spend uncapped** |

**The work closes LLM01 and LLM10, tests LLM09, and leaves the already-handled risks (LLM05/LLM06) alone.**

## 2. Goals & non-goals

**Goals**
- A single guardrail entry point inspecting concierge input before the model runs.
- A per-session token budget that caps cumulative spend (LLM10).
- An in-repo, on-demand eval harness with suites mirroring the OWASP table.
- Evals that *prove the guardrails fire*, not just that the model is nice.

**Non-goals (YAGNI)**
- A separate eval service/project.
- CI gating of evals (on-demand local only).
- A session database (stays cookie + Upstash).
- Output-side XSS sanitization (already safe).
- Replacing the `needsApproval` lead gate (already exists).
- Automated continuous red-teaming.

## 3. Workstream A — Runtime guardrails

### 3.1 Module layout

```
lib/ai/guardrails/
  index.ts        # evaluateInput(text, ctx) → GuardrailDecision  (sole entry point)
  heuristics.ts   # Tier 0: length, injection signatures, cheap deterministic checks
  classifier.ts   # Tier 1: Haiku generateObject classification
  budget.ts       # per-session token accounting in Upstash
  config.ts       # signatures, caps, budgets, model id, kill-switch read
  types.ts        # GuardrailDecision = { action: 'allow'|'block'|'flag', category, tier, reason }
```

### 3.2 Pipeline (layered: heuristics + cheap LLM gate)

- **Tier 0 — heuristics, free, always runs.** Hard-blocks *only* unambiguous cases: oversize input, exact injection signatures ("ignore previous instructions", "reveal your system prompt", role-prefix attacks), and **session token budget exceeded**. Everything else falls through to Tier 1. The hard-block list is intentionally narrow to keep false positives near zero.
- **Tier 1 — Haiku classifier, cheap, conditional.** One `generateObject` call → `{ category: 'on_topic' | 'off_topic' | 'injection' | 'abusive', allow: boolean, reason }`. Handles the *fuzzy* judgments (off-topic spend-burn, subtle injection, abuse) that keyword lists cannot. Skipped entirely when Tier 0 already decided.
- **Decision → response.** `allow` → proceed to `streamText`. `block` → canned brand-voice refusal returned directly, **zero model spend**. `flag` → proceed but mark the session in logs for eval review.

Topical/abuse judgment lives in Tier 1 (intent-aware) rather than a Tier-0 keyword list (phrase-blind), so a legitimately-phrased PCS question is never wrongly refused.

### 3.3 Hook point

One `await evaluateInput(latestUserText, { sessionId, pageContext })` call in `app/api/chat/route.ts`, inserted **after** the rate-limit check (currently ends line 60) and **before** the `streamText` try-block. A `block` returns early with the canned refusal emitted as a **UI message stream** (via `createUIMessageStream`, not raw text) so the existing `useChat` widget renders it as a normal assistant turn — same response shape as a successful turn, just with **no model call**. It is a conversational turn, not an HTTP error.

### 3.4 Token budget (the LLM10 close)

- Storage: **Upstash** (already a dependency), keyed by the existing `vpcs_concierge_sid` session id — never a cookie value (client-controllable).
- Pre-flight: `budget.ts` reads `concierge:tokens:<sid>`; `>=` daily cap → Tier-0 `block`. **Starter cap: 200,000 tokens/session/day** — generous headroom for any real PCS conversation (~2–5k tokens/turn), a hard backstop against a scripted runaway. Tunable from `report.ts` observations.
- Post-stream: attach `onFinish` to the existing `streamText` call to increment the counter by `usage.totalTokens`, with a rolling TTL (daily reset).
- Rationale: `stepCountIs(12)` caps one turn and the IP rate-limit caps frequency, but neither caps cumulative spend per session. The budget does.

### 3.5 Failure modes (aligned with existing `lib/spam-protection.ts`)

The existing spam layer treats deterministic local checks as authoritative and fails *open* on remote-check errors. The guardrail follows the same philosophy:

- Tier 0 is local → authoritative, cannot fail.
- Tier 1 Haiku error/timeout → **fail open (allow)**, logged. Availability beats perfect filtering; Tier 0 caught the blatant cases; blast radius of a missed injection is small because LLM06 is approval-gated and LLM05 output is XSS-safe.
- Upstash error on budget read → **fail open**, logged (matches `evaluateLeadSpam`).
- Kill-switch: `GUARDRAILS_ENFORCED` env var (mirrors `LEAD_SPAM_ENFORCED`); any value but `'0'` = enforced.

### 3.6 Logging & privacy

Log `{ action, category, tier, sessionId, matchedSignature }` — **never raw message bodies** (privacy rule). Signature *name* only, not user text.

### 3.7 Justified refactor

Extract the model invocation into **`lib/ai/run-concierge.ts`**: `runConcierge({ messages, pageContext, tools? })` builds tools + system prompt and runs the model. `route.ts` keeps the full perimeter (flag → parse → BotID → rate-limit → guardrail → session) and calls the core for streaming; evals call the same core with `generateText` for a non-streaming `{ text, toolCalls, steps, usage }` result. This prevents eval/prod drift — the entire value of evals depends on testing the real loop.

## 4. Workstream B — Eval harness

### 4.1 Layout

```
evals/
  lib/
    run.ts          # runConcierge() driver → wraps lib/ai/run-concierge with generateText
    judge.ts        # judge(text, rubric) → { pass, reason } via MODELS.judge (Haiku)
    report.ts       # prints pass/fail summary + total token spend per run
  fixtures/
    jailbreaks.json # extensible injection/jailbreak corpus
  safety.eval.ts          # LLM01/abuse — asserts evaluateInput() BLOCKS the corpus
  faithfulness.eval.ts    # LLM09 — asserts answers contain only tool-returned facts
  tool-selection.eval.ts  # LLM06/correctness — right tool for intent; no auto-submit
  brand-voice.eval.ts     # tone / reading-level / no-emoji via judge()
vitest.eval.config.ts     # include: ['evals/**/*.eval.ts'], node env, @ alias
```

Run via **`npm run eval`** = `vitest run -c vitest.eval.config.ts`. **Zero new dependencies** (reuses Vitest 4 + node env + `@` alias). Lives outside `__tests__`, so `npm test`'s `include: ['**/__tests__/**/*.test.ts']` never picks it up and pre-commit stays unaffected.

### 4.2 Two kinds of target (explicit)

- **Safety suite tests the guardrail function** (`evaluateInput`) directly — fast and deterministic for Tier 0, a few Haiku calls for Tier 1. This is how Workstream A is *proven*.
- **Faithfulness / tool-selection / brand-voice suites test the model** via `runConcierge`.

### 4.3 Cases, judge, tools

- **Cases:** typed TS arrays co-located per suite; the bulk jailbreak list is `fixtures/jailbreaks.json` (easy to grow).
- **Judge:** `generateObject` with a `{ pass: boolean, reason: string }` schema, Haiku by default; reason printed for every case.
- **Tools:** `runConcierge` accepts an optional `tools` override. **Default in the inner loop = mocked tools** (deterministic, free, reproducible). **Real tools against known-data states (e.g., TX) run only as the final confidence gate** — live Salesforce/Sanity data is non-reproducible and would flake the inner loop.

### 4.4 Model registry

Add to `lib/ai/models.ts`:

```ts
export const MODELS = {
  chat: 'anthropic/claude-sonnet-4-6',
  guardrail: 'anthropic/claude-haiku-4-5',  // Tier 1 classifier
  judge: 'anthropic/claude-haiku-4-5',      // eval LLM-as-judge
} as const;
```

### 4.5 Cost control

Small curated case counts; Haiku judge; `report.ts` prints total token spend each run. Env for a full run: `AI_GATEWAY_API_KEY` (+ Salesforce/Sanity creds only for the real-tool faithfulness gate).

## 5. Data flow

**Request (prod):** `POST /api/chat` → flag → JSON parse → `parseChatRequest` → BotID → IP rate-limit → **`evaluateInput`** (Tier 0 → Tier 1) → `block` returns canned refusal *or* `allow`/`flag` → `runConcierge` streams → `onFinish` increments session token budget.

**Eval:** suite case → `runConcierge` (or `evaluateInput` directly for safety) with mocked or real tools → `generateText` result `{ text, toolCalls, usage }` → deterministic asserts (tool calls, guardrail action) and/or `judge()` (prose) → `report.ts` aggregates pass/fail + token spend.

## 6. Error handling (summary)

| Failure | Behavior |
|---|---|
| Tier 1 Haiku error/timeout | Fail open (allow), log |
| Upstash budget read error | Fail open, log |
| `GUARDRAILS_ENFORCED=0` | All guardrail checks disabled |
| `streamText` throws | Existing 500 JSON path (unchanged) |
| Eval judge nondeterminism | Confidence = stable green across 2–3 consecutive runs |

## 7. Build sequence

1. **A-refactor** — extract `run-concierge.ts`; existing tests stay green (no behavior change).
2. **A-Tier0** — heuristics + session token budget, wired into route behind `GUARDRAILS_ENFORCED`.
3. **A-Tier1** — Haiku classifier.
4. **B-scaffold** — `run.ts`, `judge.ts`, `report.ts`, config, `npm run eval` + tool-selection & faithfulness suites.
5. **B-safety** — safety suite + brand-voice suite + jailbreak corpus (closes the loop: evals now test the guardrail).

## 8. Execution & orchestration strategy

**Controller:** Claude (Opus 4.8) stays in this session and orchestrates; no inherited context is passed to subagents — each gets exactly the curated task text + context it needs.

**Phase 1 — Build (subagent-driven-development).** One *fresh* implementer subagent per task in build-sequence order, each followed by two-stage review (spec-compliance → code-quality) with fix loops before the task is marked complete. Sequential only — parallel implementers on one branch collide. Subagents follow TDD for `lib/ai/guardrails/**` (unit tests in `__tests__`); the eval suites *are* the harness.

**Phase 2 — Confidence loop.** Once the harness exists:

```
run `npm run eval` → read report → triage failures into clusters
  → dispatch one targeted fix subagent per cluster → re-run → repeat
```

Failure routing:
- *Safety* miss → Tier-0 signature gap or Tier-1 misclassification → fix guardrail.
- *Faithfulness* miss → model invented data → tighten prompt / tool contract.
- *Tool-selection* miss → wrong tool or auto-submit → fix tool descriptions / approval path.
- *Brand-voice* miss → judge rubric fail → prompt tuning.

**Termination — "highly confident" = stable green across 2–3 consecutive full runs** (single green can be nondeterministic luck).

**Cost guardrails for the loop:**
- Inner loop uses **mocked tools**; **real-tool faithfulness runs only as the final gate**.
- **Max-iteration cap (8)** — a stubborn failure escalates to Harper rather than burning tokens.
- `report.ts` prints token spend per run; cost stays visible.

**Mechanism note:** there is no skill literally named `goal`. The path is subagent-driven-development (build) + this eval-driven loop (confidence), optionally self-paced with `/loop` for unattended grinding. If a custom `/goal` command exists, it can substitute for the self-pacing step.

**Branch discipline:** all commits — starting with this spec — live on `ai/concierge-evals-guardrails`, never main.

## 9. Testing strategy

- `lib/ai/guardrails/**` → TDD unit tests in `__tests__` (Tier-0 logic, budget math, decision shapes); run by `npm test`.
- Behavior of the whole concierge → `evals/` suites; run on-demand by `npm run eval`.
- Pre-commit (`lint && type-check && build`) must stay green; `npm test` run manually for `lib/ai/**` changes per CLAUDE.md.

## 10. Open decisions (defaults chosen; override at will)

- Daily session token cap → starter default **200,000 tokens/session/day** (§3.4); tune from `report.ts` once real traffic is observed.
- Exact Tier-0 injection signature list → seeded from the jailbreak corpus during B-safety.
- Whether the loop self-paces via `/loop` or runs inline → default inline (controller stays engaged); `/loop` available if unattended grinding is wanted.
