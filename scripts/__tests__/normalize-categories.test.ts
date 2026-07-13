import { describe, expect, it } from 'vitest';

const FIXTURE = `---
title: "Fort Hood PCS Guide: What to Expect"
slug: fort-hood-pcs-guide
component: U.S. Military Bases
categories:
  - US Military Bases
  - PCS Help
description: >-
  A guide that mentions US Military Bases in a folded scalar, which must not
  be rewritten.
---

Body copy mentioning US Military Bases stays untouched.

- US Military Bases
`;

describe('normalize-blog-categories', () => {
  it('rewrites only the frontmatter dash item, preserving indentation', async () => {
    const { rewriteCategories } = await import('../normalize-blog-categories.mjs');
    const result = rewriteCategories(FIXTURE);

    expect(result.changed).toBe(true);
    expect(result.changedLines).toBe(1);
    expect(result.content).toContain('  - U.S. Military Bases');
    expect(result.content).toContain('  - PCS Help');
    // Folded-scalar description and body copy keep the original spelling.
    expect(result.content).toContain('mentions US Military Bases in a folded scalar');
    expect(result.content).toContain('Body copy mentioning US Military Bases stays untouched.');
    // The dash item in the body (after the closing ---) is not rewritten.
    expect(result.content).toContain('\n\n- US Military Bases\n');
  });

  it('preserves quoting style on quoted dash items', async () => {
    const { rewriteCategories } = await import('../normalize-blog-categories.mjs');
    const single = rewriteCategories(`---\ncategories:\n  - 'US Military Bases'\n---\nbody\n`);
    expect(single.content).toContain("  - 'U.S. Military Bases'");
    const double = rewriteCategories(`---\ncategories:\n  - "US Military Bases"\n---\nbody\n`);
    expect(double.content).toContain('  - "U.S. Military Bases"');
    // Mismatched quotes are not a dash-item match; leave the line alone.
    const mismatched = rewriteCategories(`---\ncategories:\n  - 'US Military Bases"\n---\nbody\n`);
    expect(mismatched.changed).toBe(false);
  });

  it('throws the tripwire when a component line matches an alias', async () => {
    const { rewriteCategories } = await import('../normalize-blog-categories.mjs');
    expect(() =>
      rewriteCategories(`---\ncomponent: US Military Bases\ncategories:\n  - PCS Help\n---\nbody\n`),
    ).toThrow(/component line matches alias/);
  });

  it('returns unchanged content when there is no frontmatter or no match', async () => {
    const { rewriteCategories } = await import('../normalize-blog-categories.mjs');
    expect(rewriteCategories('no frontmatter\n- US Military Bases\n').changed).toBe(false);
    expect(rewriteCategories(`---\ncategories:\n  - PCS Help\n---\nbody\n`).changed).toBe(false);
  });
});
