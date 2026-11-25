import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubProductionEnv, stubWebdevEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';
import RefinancingHero from '../RefinancingHero';

describe('Refinancing contact links', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('renders the featured lender selection and direct phone on production', () => {
    stubProductionEnv();
    const html = renderToStaticMarkup(<RefinancingHero />);
    expect(html).toContain('Connect with Jamie');
    expect(html).toContain('id=0014x0000100OSg');
    expect(html).toContain('href="tel:');
  });

  it('offers only the general lender contact in WebDev', () => {
    stubWebdevEnv();
    const html = renderToStaticMarkup(<RefinancingHero />);
    expect(html).toContain('href="/contact-lender"');
    expect(html).toContain('Connect with a Lender');
    expect(html).not.toContain('0014x0000100OSg');
    expect(html).not.toContain('href="tel:');
  });
});
