import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// LLM06 (Excessive Agency) guard: every lead-submit tool MUST keep needsApproval:true
// so a lead can never be written without an explicit user click. Asserted at the
// source level because lead-tools.ts imports 'server-only' (cannot import under Vitest).
describe('lead tools approval gate', () => {
  it('declares needsApproval: true for all four submit tools', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../lead-tools.ts'),
      'utf8',
    );
    const matches = src.match(/needsApproval:\s*true/g) ?? [];
    expect(
      matches,
      'OWASP LLM06 guard: each of the 4 lead-submit tools in lead-tools.ts must declare needsApproval: true so a lead is never written without an explicit user click. If you added or renamed a submit tool, update this count.',
    ).toHaveLength(4);
  });
});
