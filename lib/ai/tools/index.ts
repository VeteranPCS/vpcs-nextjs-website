import { dataTools } from '@/lib/ai/tools/data-tools';
import { calcTools } from '@/lib/ai/tools/calc-tools';
import { buildLeadTools } from '@/lib/ai/tools/lead-tools';
import { routingTools } from '@/lib/ai/tools/routing-tools';

export function buildTools(analyticsContext?: Record<string, unknown>) {
  return {
    ...routingTools,
    ...dataTools,
    ...calcTools,
    ...buildLeadTools(analyticsContext),
  };
}

export type ConciergeTools = ReturnType<typeof buildTools>;
