import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));

import { getLeadOwnerForState } from '@/services/salesforceLeadOwnerRouting';

describe('salesforceLeadOwnerRouting', () => {
  beforeEach(stubProductionEnv);
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ['colorado', 'BETH', 'Beth', '0054x000005GsUvAAK', 'Beth Soldner'],
    ['texas', 'BETH', 'Beth', '0054x000005GsUvAAK', 'Beth Soldner'],
    ['florida', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['indiana', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['new-york', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['puerto-rico', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
    ['PR', 'STEPHANIE', 'Stephanie', '0054x0000082vHgAAI', 'Stephanie Guree'],
  ])('returns the production owner config for %s', (state, adminKey, adminName, ownerId, ownerName) => {
    expect(getLeadOwnerForState(state)).toEqual({
      adminKey,
      adminName,
      ownerId,
      ownerName,
    });
  });

  it('uses the configured Stephanie owner for unknown or missing states', () => {
    expect(getLeadOwnerForState('not-a-state')).toEqual(getLeadOwnerForState('PR'));
    expect(getLeadOwnerForState()).toEqual(getLeadOwnerForState('PR'));
  });
});
