// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { BlogPost, ResolvedAuthor } from '@/lib/blog/types';

vi.mock('server-only', () => ({}));
// eslint-disable-next-line @next/next/no-img-element
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: Record<string, unknown>) => <img {...props} alt={String(props.alt ?? '')} /> }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('@/mdx-components', () => ({ createBlogMdxComponents: (args: unknown) => args }));
vi.mock('next-mdx-remote/rsc', () => ({ MDXRemote: ({ source }: { source: string }) => <div data-testid="source-fragment">{source}</div> }));
vi.mock('@/services/salesForcePostFormsService', () => ({ KeepInTouchForm: vi.fn(), homebuyerGuideForm: vi.fn(), vaLoanGuideForm: vi.fn(), coloradoRelocationGuideForm: vi.fn() }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: track, trackFormStarted: vi.fn(), captureAnalyticsEvent: vi.fn(), trackFormSubmitAttempted: vi.fn(), trackFormSubmissionFailed: vi.fn(), formTrackingPayload: () => ({}) }));
const gtm = vi.hoisted(() => vi.fn());
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: gtm }));
const flag = vi.hoisted(() => ({ value: undefined as string | boolean | undefined, keys: [] as string[] }));
vi.mock('@/lib/analytics/useFeatureFlagVariant', () => ({ useFeatureFlagVariant: (key: string) => { flag.keys.push(key); return flag.value; } }));

import StephArticle from '../StephArticle';

const paragraph = 'Planning a military move takes time and a good local guide. '.repeat(12).trim();
const content = `${paragraph}\n\n## Bases\n\n${paragraph}\n\n## Housing\n\n${paragraph}\n\n## Schools\n\n${paragraph}\n\n## Next steps\n\n${paragraph}`;
const blog: BlogPost = { title: 'What Military Bases are in Texas?', metaTitle: 'Texas bases', metaDescription: 'Guide summary', description: 'Planning help', slug: 'what-military-bases-are-in-texas', publishedAt: '2026-06-01', component: 'U.S. Military Bases', categories: ['U.S. Military Bases'], mainImage: { src: '/images/blog/test.webp', alt: 'Article image' }, author: {}, content, filepath: 'test.mdx' };
const author: ResolvedAuthor = { kind: 'fallback', salesforceId: null, sourceSalesforceId: null, role: 'organization', active: false, matchKind: 'fallback', firstName: '', lastName: '', fullName: 'VeteranPCS', name: 'VeteranPCS', city: null, state: null, stateSlug: null, militaryStatus: null, brokerage: null, headshotPath: null, contactHref: '/contact-agent', isAgent: false, isLender: false };

type Options = { hubStateSlug?: string | null; intent?: 'agent' | 'lender'; category?: { label: string; slug: string } | null; body?: string };
function article({ hubStateSlug = 'texas', intent = 'agent', category = { label: 'U.S. Military Bases', slug: 'us-military-bases' }, body = content }: Options = {}) {
  return <StephArticle blog={{ ...blog, content: body }} resolvedAuthor={author} stateSlug={hubStateSlug} hubStateSlug={hubStateSlug} intent={intent} category={category} related={[]} />;
}
const hubBlocks = () => Array.from(document.querySelectorAll<HTMLElement>('[data-cta-id="blog_state_hub_cta"]'));
const hubHref = (slug: string) => `/${slug}?source=blog&blog_slug=what-military-bases-are-in-texas`;

beforeEach(() => { track.mockClear(); gtm.mockClear(); flag.value = undefined; flag.keys = []; });
afterEach(cleanup);

describe('blog state hub CTA', () => {
  it.each([undefined, false, 'control', 'other'])('renders nothing for flag value %s and leaves the body whole', (value) => {
    flag.value = value;
    render(article());
    expect(hubBlocks()).toHaveLength(0);
    expect(screen.getAllByTestId('source-fragment').map((node) => node.textContent).join('')).toBe(content);
    expect(new Set(flag.keys)).toEqual(new Set(['blog-state-hub-cta']));
  });

  it.each(['test', true])('shows inline and end blocks linking to the state hub for flag value %s', (value) => {
    flag.value = value;
    render(article());
    const blocks = hubBlocks();
    expect(blocks.map((block) => block.dataset.placement)).toEqual(['inline', 'end']);
    for (const block of blocks) expect(within(block).getByRole('link').getAttribute('href')).toBe(hubHref('texas'));
    expect(within(blocks[0]!).getByRole('heading', { name: 'Moving to Texas?' })).toBeTruthy();
    expect(within(blocks[0]!).getByRole('link', { name: 'Find an agent in Texas' })).toBeTruthy();
    expect(within(blocks[1]!).getByRole('heading', { name: 'Ready to find your Texas agent?' })).toBeTruthy();
  });

  it('places the inline block after the first section and before the existing mid-article promotion', () => {
    flag.value = 'test';
    render(article());
    const [inline, end] = hubBlocks();
    const fragments = screen.getAllByTestId('source-fragment');
    expect(fragments[0]!.textContent).toContain('## Bases');
    expect(fragments[1]!.textContent!.startsWith('## Housing')).toBe(true);
    const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(fragments[0]!, inline!)).toBe(true);
    expect(follows(inline!, fragments[1]!)).toBe(true);
    expect(follows(inline!, screen.getByRole('region', { name: 'Plan your next move' }))).toBe(true);
    expect(screen.getByRole('article', { name: 'Article body' }).contains(end!)).toBe(false);
    expect(follows(fragments.at(-1)!, end!)).toBe(true);
  });

  it('fires cta_clicked exactly once per click with the experiment properties', () => {
    flag.value = 'test';
    render(article());
    const [inline, end] = hubBlocks();
    fireEvent.click(within(inline!).getByRole('link'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenLastCalledWith(expect.objectContaining({
      cta_id: 'blog_state_hub_cta', cta_intent: 'state_agent_search', cta_position: 'inline_after_intro', cta_component: 'blog_state_hub_cta',
      placement: 'inline', state_source: 'post', state_slug: 'texas', content_slug: 'what-military-bases-are-in-texas',
      page_type: 'blog_post', content_type: 'blog_post', partner_type: 'agent', destination_path: '/texas', cta_label: 'Find an agent in Texas',
    }));
    expect(gtm).toHaveBeenCalledTimes(1);
    expect(gtm).toHaveBeenLastCalledWith({ event: 'blog_to_state_cta_click', state: 'texas', blog_slug: 'what-military-bases-are-in-texas', position: 'inline' });
    fireEvent.click(within(end!).getByRole('link'));
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith(expect.objectContaining({ cta_id: 'blog_state_hub_cta', placement: 'end', cta_position: 'article_end', state_slug: 'texas' }));
  });

  it('uses buying copy and keeps lender attribution on finance posts', () => {
    flag.value = 'test';
    render(article({ hubStateSlug: 'west-virginia', intent: 'lender', category: { label: 'Financial Guidance', slug: 'financial-guidance' } }));
    const [inline] = hubBlocks();
    expect(within(inline!).getByRole('heading', { name: 'Buying or selling in West Virginia?' })).toBeTruthy();
    const link = within(inline!).getByRole('link', { name: 'Find an agent in West Virginia' });
    expect(link.getAttribute('href')).toBe(hubHref('west-virginia'));
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ state_slug: 'west-virginia', partner_type: 'lender', destination_path: '/west-virginia' }));
  });

  it('offers a state picker when the post has no state', () => {
    flag.value = 'test';
    render(article({ hubStateSlug: null }));
    const [inline] = hubBlocks();
    expect(within(inline!).getByRole('heading', { name: 'Where are you PCSing?' })).toBeTruthy();
    expect(within(inline!).queryByRole('link')).toBeNull();
    const select = within(inline!).getByRole('combobox', { name: 'State' });
    expect(within(select).getAllByRole('option')).toHaveLength(53);

    fireEvent.click(within(inline!).getByRole('button', { name: 'See agents' }));
    expect(within(inline!).getByRole('status').textContent).toBe('Choose a state first.');
    expect(document.activeElement).toBe(select);
    expect(track).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: 'new-mexico' } });
    expect(track).not.toHaveBeenCalled();
    const link = within(inline!).getByRole('link', { name: 'See New Mexico agents' });
    expect(link.getAttribute('href')).toBe(hubHref('new-mexico'));
    fireEvent.click(link);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenLastCalledWith(expect.objectContaining({ cta_id: 'blog_state_hub_cta', placement: 'inline', state_source: 'picker', state_slug: 'new-mexico', destination_path: '/new-mexico' }));
  });

  it('shows only the end block when the body has no section to follow', () => {
    flag.value = 'test';
    render(article({ body: '## Short guide\n\nThe complete short article.' }));
    expect(hubBlocks().map((block) => block.dataset.placement)).toEqual(['end']);
  });

  it('leaves the mobile sticky bar pointing at the contact form', () => {
    flag.value = 'test';
    render(article());
    const sticky = document.querySelector('[data-cta-id="blog_mobile_sticky_agent"]');
    expect(sticky?.querySelector('a')?.getAttribute('href')).toBe('/contact-agent?form=agent&state=texas');
  });
});
