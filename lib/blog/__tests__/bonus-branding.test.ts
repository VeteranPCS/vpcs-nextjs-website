import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { extractTocHeadings } from '../mdx';

vi.mock('server-only', () => ({}));

const read = (path: string) => readFileSync(path, 'utf8');

describe('VeteranPCS Bonus editorial compatibility', () => {
  it('keeps old article links while the table of contents targets the renamed heading', () => {
    const article = read('content/blog/buying-a-home-after-military-service.mdx');
    expect(article).toContain('<span id="your-veteranpcs-move-in-bonus" data-legacy-heading-anchor />\n\n## Your VeteranPCS Bonus');
    expect(extractTocHeadings(article)).toContainEqual({ id: 'your-veteranpcs-bonus', text: 'Your VeteranPCS Bonus' });
    const registry = JSON.parse(read('content/_registry/internal-links.json'));
    expect(JSON.stringify(registry)).toContain('Your VeteranPCS Bonus');
    expect(article).not.toContain('VeteranPCS Move-In Bonus');
  });

  it('preserves the legal agreement and existing bonus analytics contracts', () => {
    const terms = read('components/TermsOfUse/TermsOfUse.tsx');
    expect(terms).toContain('Move-In Bonus Agreement');
    expect(terms).toContain('8. MOVE-IN BONUS');
    const calculator = read('components/PcsResources/MovingBonusCalculator/MovingBonusCalculator.tsx');
    expect(calculator).toContain("captureAnalyticsEvent('moving_bonus_calculated'");
    expect(calculator).toContain("calculator_name: 'Moving Bonus Calculator'");
  });
});
