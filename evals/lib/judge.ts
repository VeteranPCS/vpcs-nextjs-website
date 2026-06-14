import { generateObject } from 'ai';
import { z } from 'zod';
import { MODELS } from '@/lib/ai/models';

const verdictSchema = z.object({
  pass: z.boolean(),
  reason: z.string(),
});

export interface Verdict {
  pass: boolean;
  reason: string;
  usage: { totalTokens?: number } | undefined;
}

/** Grade ANSWER against RUBRIC with a cheap model. Conservative: pass only if clearly satisfied. */
export async function judge(text: string, rubric: string): Promise<Verdict> {
  const { object, usage } = await generateObject({
    model: MODELS.judge,
    schema: verdictSchema,
    system:
      'You are a strict evaluator. Decide whether the ANSWER satisfies the RUBRIC. Pass only if it clearly does. Be conservative and explain briefly.',
    prompt: `RUBRIC:\n${rubric}\n\nANSWER:\n${text}`,
  });
  return { pass: object.pass, reason: object.reason, usage };
}
