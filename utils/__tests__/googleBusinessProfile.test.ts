import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fallbackReviews from '@/public/json/reviews.json';
import { stubProductionEnv, stubWebdevEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { fetchGoogleReviews } from '../googleBusinessProfile';

const mocks = vi.hoisted(() => ({ init: vi.fn(), authorize: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('google-auth-library', () => ({
    JWT: function JWT() {
        mocks.init();
        return { authorize: mocks.authorize };
    },
}));

describe('Google Business Profile review isolation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
        vi.stubEnv('GOOGLE_REVIEWS_LOCATION_ID', 'inherited-location');
        vi.stubEnv('GOOGLE_REVIEWS_ACCOUNT_ID', 'inherited-account');
        vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_SUBJECT', 'qa@example.test');
        vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS', Buffer.from('{}').toString('base64'));
    });
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

    it.each(['mock', 'webdev'] as const)('uses bundled reviews without initializing inherited Google credentials in %s', async (profile) => {
        stubWebdevEnv({ VPCS_SALESFORCE_PROFILE: profile });
        const offline = await fetchGoogleReviews();

        expect(offline).toEqual({
            ...fallbackReviews,
            reviews: fallbackReviews.reviews.map(review => ({
                ...review, reviewer: { ...review.reviewer, profilePhotoUrl: '' },
            })),
        });
        expect(mocks.init).not.toHaveBeenCalled();
        expect(mocks.authorize).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('keeps the bundled profile photos when production falls back to offline data', async () => {
        stubProductionEnv();
        vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS', undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(fallbackReviews.reviews.some(review => review.reviewer.profilePhotoUrl.startsWith('https://'))).toBe(true);
        await expect(fetchGoogleReviews()).resolves.toEqual(fallbackReviews);
    });
});
