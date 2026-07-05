import { describe, expect, it, vi } from 'vitest';
import {
  classifyBulk,
  findFilenameCaseVariant,
  namesMatch,
  normalizeComparableName,
  salesforceIdsReferToSameRecord,
} from '../migrate-agent-images-from-sanity.mjs';

describe('migrate-agent-images-from-sanity', () => {
  it('maps image filenames to the exact Salesforce AccountId_15__c casing', async () => {
    const sfQuery = vi.fn().mockResolvedValue({
      records: [
        {
          Id: '0014x00000IFGiXAAH',
          AccountId_15__c: '0014x00000IFGiX',
          Name: 'Chelsea Mack',
          isAgent__pc: true,
          isLender__pc: false,
          Active_on_Website__pc: true,
        },
      ],
    });

    const classifications = await classifyBulk(['0014x00000IFGiX'], {
      getSalesforceToken: async () => ({ token: 'token', instanceUrl: 'https://example.salesforce.test' }),
      sfQuery,
    });

    const sourceClassification = classifications.get('0014x00000IFGiX');

    expect(sourceClassification).toMatchObject({
      canonicalId: '0014x00000IFGiX',
      salesforceId18: '0014x00000IFGiXAAH',
      name: 'Chelsea Mack',
      isAgent: true,
      isLender: false,
      active: true,
    });
    expect(classifications.has('0014x00000IFGix')).toBe(false);
    expect(sfQuery.mock.calls[0][2]).toContain('Name');
  });

  it('does not collapse case-distinct 15-character Salesforce IDs', () => {
    expect(salesforceIdsReferToSameRecord('0014x00000IFGiX', '0014x00000IFGix')).toBe(false);
    expect(salesforceIdsReferToSameRecord('0014x00000IFGiXAAH', '0014x00000IFGiX')).toBe(true);
  });

  it('detects filename variants that would collide on a case-insensitive filesystem', () => {
    expect(
      findFilenameCaseVariant(
        ['0014x00000IFGiX.webp', '0014x00000W8M4w.webp'],
        '0014x00000IFGix.webp',
      ),
    ).toBe('0014x00000IFGiX.webp');
    expect(
      findFilenameCaseVariant(
        ['0014x00000IFGix.webp', '0014x00000W8M4w.webp'],
        '0014x00000IFGix.webp',
      ),
    ).toBeNull();
  });

  it('normalizes punctuation and spacing before comparing Sanity and Salesforce names', () => {
    expect(normalizeComparableName(' Julie  &  Alan Cash ')).toBe('julie and alan cash');
    expect(namesMatch('Christina Zimmerman', 'Christina Zimmerman')).toBe(true);
    expect(namesMatch('Carissa Duran', 'Christina Zimmerman')).toBe(false);
  });
});
