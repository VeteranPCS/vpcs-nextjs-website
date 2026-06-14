export type GuardrailAction = 'allow' | 'block' | 'flag';

export type GuardrailCategory =
  | 'clean'
  | 'off_topic'
  | 'injection'
  | 'abusive'
  | 'budget'
  | 'oversize';

export interface GuardrailDecision {
  action: GuardrailAction;
  category: GuardrailCategory;
  /** 0 = deterministic heuristics/budget, 1 = Haiku classifier. */
  tier: 0 | 1;
  reason: string;
}
