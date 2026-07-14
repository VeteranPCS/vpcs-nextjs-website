import { describe, expect, it, vi } from 'vitest';

// mediaAccountService transitively imports the server-only media_account
// loader; stub the marker package (same approach as stateService.test.ts).
vi.mock('server-only', () => ({}));

import mediaAccountService from '@/services/mediaAccountService';
import mediaAccountsJson from '@/content/_data/site/media_account.json';

describe('mediaAccountService.fetchAccounts (repo-content backed)', () => {
  it('returns one row per exported document, in export order, with the full document keys', async () => {
    const accounts = await mediaAccountService.fetchAccounts();
    expect(accounts.length).toBe((mediaAccountsJson as unknown[]).length);
    // The Sanity query had no order(); order must match the committed export.
    expect(accounts.map((acc) => acc._id)).toEqual(
      (mediaAccountsJson as { _id: string }[]).map((doc) => doc._id),
    );
    for (const account of accounts) {
      // Byte-compatible with the Sanity-era query (no projection → full
      // document): { _id, _type, _createdAt, _updatedAt, icon, link, name, slug }
      expect(Object.keys(account).sort()).toEqual(
        ['_createdAt', '_id', '_type', '_updatedAt', 'icon', 'link', 'name', 'slug'],
      );
      // The MediaAccountProps contract consumers actually read.
      expect(account._id).not.toBe('');
      expect(account.name).not.toBe('');
      expect(account.icon).not.toBe('');
      expect(account.link).toMatch(/^https:\/\//);
    }
  });
});
