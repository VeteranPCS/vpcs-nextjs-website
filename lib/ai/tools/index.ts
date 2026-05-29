import { dataTools } from '@/lib/ai/tools/data-tools';
import { calcTools } from '@/lib/ai/tools/calc-tools';
import { leadTools } from '@/lib/ai/tools/lead-tools';

export function buildTools() {
  return {
    ...dataTools,
    ...calcTools,
    ...leadTools,
  };
}

export type ConciergeTools = ReturnType<typeof buildTools>;
