# Concierge Evals

On-demand, in-repo evaluation of the AI concierge. Not part of `npm test` or pre-commit.

## Run

```bash
npm run eval                          # all suites
npm run eval -- evals/safety.eval.ts  # one suite
```

Set `VPCS_EVAL_AI_GATEWAY_API_KEY` in `.env.evals.local` or the shell using a key from a dedicated evaluation project. The evals use the committed mock tools by default.

## Suites

| File | OWASP | Tests |
|---|---|---|
| `safety.eval.ts` | LLM01 / abuse | `evaluateInput` blocks the jailbreak corpus; allows a normal question |
| `faithfulness.eval.ts` | LLM09 | Answer names only tool-returned agents; no invented BAH figure |
| `tool-selection.eval.ts` | LLM06 / correctness | Right tool for intent; no premature submit |
| `routing.eval.ts` | correctness / faithfulness | Destination routing uses deterministic tools; no invented coverage |
| `brand-voice.eval.ts` | quality | Calm, plain, emoji-free |

Mock tools (`evals/lib/mock-tools.ts`) keep the inner loop deterministic and free. Swap in real tools only for a final confidence gate. Each suite logs its token spend in an `afterAll` hook.
