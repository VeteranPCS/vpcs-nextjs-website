/** PostHog feature flag that gates the blog → state hub call to action. */
export const BLOG_STATE_HUB_CTA_FLAG = 'blog-state-hub-cta';
export const BLOG_STATE_HUB_CTA_ID = 'blog_state_hub_cta';

export type StateHubCtaPlacement = 'inline' | 'end';
export type StateHubCtaAudience = 'moving' | 'buying';

/**
 * `test` is the experiment variant; `true` covers a plain boolean rollout.
 * Everything else, including flags that never loaded, is the control page.
 */
export function isStateHubCtaVariant(value: unknown): boolean {
  return value === true || value === 'test';
}

export function buildStateHubHref(stateSlug: string, contentSlug: string): string {
  return `/${stateSlug}?source=blog&blog_slug=${encodeURIComponent(contentSlug)}`;
}

const BUYING_CATEGORIES = new Set(['financial-guidance', 'va-loan-help', 'real-estate-insights']);

/** Finance and real-estate readers may already live in the state; base and PCS readers are moving there. */
export function stateHubCtaAudience(categorySlug: string | null | undefined): StateHubCtaAudience {
  return categorySlug && BUYING_CATEGORIES.has(categorySlug) ? 'buying' : 'moving';
}
