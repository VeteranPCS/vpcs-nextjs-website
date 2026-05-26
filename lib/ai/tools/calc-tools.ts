import { tool } from 'ai';
import {
  extractBAHData,
  RANK_MAPPING,
  type BAHData,
} from '@/lib/bah-scraper';
import { logError, logInfo } from '@/services/loggingService';
import { bahInputSchema, type ToolResult } from '@/lib/ai/tools/types';

// Reverse map: RANK_MAPPING is { '5': 'E-5', ... }.
// We want the model-friendly inputs ("E5", "E-5", "e5") to resolve to the numeric id "5".
function normalizeRankKey(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

const RANK_NAME_TO_ID: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, name] of Object.entries(RANK_MAPPING)) {
    const key = normalizeRankKey(name);
    out[key] = id;
  }
  // Common alias: the BAH source labels the highest officer bucket "O-7/O-7+";
  // accept plain "O7" as a synonym so the model doesn't need to know that.
  out['O7'] = out['O7'] ?? out['O7/O7+'];
  // DTMO caps officer rates at O-7+; route O-8/O-9/O-10 to the same bucket.
  out['O8'] = out['O9'] = out['O10'] = out['O7'];
  return out;
})();

function resolveRankId(rank: string): string | null {
  const key = normalizeRankKey(rank);
  return RANK_NAME_TO_ID[key] ?? null;
}

const calculateBAHTool = tool({
  description:
    'Calculate the Basic Allowance for Housing (BAH) for a given year, ZIP code, and pay grade. Pay grade values like E1–E9, O1–O7, W1–W5. The BAH source caps officer rates at O-7+, so O-8 and above use the O-7+ rate. Returns monthly amounts for with-dependents and without-dependents, plus the Military Housing Area name.',
  inputSchema: bahInputSchema,
  execute: async ({
    year,
    zipCode,
    rank,
  }): Promise<ToolResult<BAHData>> => {
    const rankId = resolveRankId(rank);
    if (!rankId) {
      logInfo('Concierge tool: calculateBAH invalid rank', { rank });
      return {
        ok: false,
        error: `Unknown pay grade "${rank}". Use a value like E5, O3, W2.`,
      };
    }
    try {
      const data = await extractBAHData(year, zipCode, rankId);
      logInfo('Concierge tool: calculateBAH', {
        year,
        zipCode,
        rank: data.rank,
      });
      return { ok: true, data };
    } catch (error) {
      logError(
        'Concierge tool: calculateBAH failed',
        { year, zipCode, rank },
        error,
      );
      const message =
        error instanceof Error ? error.message : 'BAH lookup failed.';
      return { ok: false, error: message };
    }
  },
});

export const calcTools = {
  calculateBAH: calculateBAHTool,
};
