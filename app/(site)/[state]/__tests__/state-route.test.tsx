import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/components/StatePage/StatePaheHeroSection/StatePageHeroSection', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageVaLoan/StatePageVaLoan', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageCTA/StatePageCTA', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageCityAgents/StatePageCityAgents', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageRelatedGuides/StatePageRelatedGuides', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent', () => ({ default: () => null }));
vi.mock('@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcs', () => ({ default: () => null }));
vi.mock('@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions', () => ({ default: () => null }));
vi.mock('@/components/homepage/KeepInTouch/KeepInTouch', () => ({ default: () => null }));
vi.mock('@/components/Analytics/Trackers', () => ({ StatePageViewedTracker: () => null }));
vi.mock('@/services/stateService', () => ({ default: { fetchStateImage: vi.fn(), fetchStateList: vi.fn() } }));
vi.mock('@/services/statePageService', () => ({ fetchStatePageData: vi.fn() }));
import states from '@/content/_data/us-states.json';
import { SITE_URL } from '@/lib/siteUrl';
import stateService from '@/services/stateService';
import { fetchStatePageData } from '@/services/statePageService';
import StatePage, { generateMetadata, revalidate } from '../page';

beforeEach(() => { vi.resetAllMocks(); });
describe('canonical state route guard', () => {
  it.each(['not-a-state', 'intership', 'California', 'constructor', '__proto__'])('404s %s before any image or partner access', async (state) => {
    const params = Promise.resolve({ state });
    await expect(StatePage({ params })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    await expect(generateMetadata({ params })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(fetchStatePageData).not.toHaveBeenCalled();
    expect(stateService.fetchStateImage).not.toHaveBeenCalled();
  });
  it.each(states)('preserves metadata and genuine upstream failures for $slug', async ({ slug }) => {
    const error = new Error('upstream unavailable');
    vi.mocked(fetchStatePageData).mockRejectedValue(error);
    vi.mocked(stateService.fetchStateImage).mockResolvedValue('https://www.veteranpcs.com/map.png');
    const params = Promise.resolve({ state: slug });
    expect((await generateMetadata({ params })).alternates.canonical).toBe(`${SITE_URL}/${slug}`);
    await expect(StatePage({ params })).rejects.toBe(error);
    expect(fetchStatePageData).toHaveBeenCalledWith(slug);
    vi.mocked(stateService.fetchStateImage).mockRejectedValue(error);
    await expect(generateMetadata({ params })).rejects.toBe(error);
  });
  it('retains all 52 states/territories and the 12-hour revalidation policy', () => {
    expect(states).toHaveLength(52); expect(revalidate).toBe(43200);
  });
});
