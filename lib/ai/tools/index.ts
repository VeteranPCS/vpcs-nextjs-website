import { dataTools } from '@/lib/ai/tools/data-tools';
import { calcTools } from '@/lib/ai/tools/calc-tools';
import { leadTools } from '@/lib/ai/tools/lead-tools';
import { routingTools } from '@/lib/ai/tools/routing-tools';

export function buildTools() {
  return {
    ...routingTools,
    ...dataTools,
    ...calcTools,
    ...leadTools,
  };
}

export type ConciergeTools = ReturnType<typeof buildTools>;
