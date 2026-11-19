// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '@/app/(site)/contact-agent/page';
import { captureAnalyticsEvent, trackFormStarted } from '@/lib/analytics/client';

const sdk = vi.hoisted(() => ({ __loaded: true, flag: undefined as unknown, getFeatureFlag: vi.fn(), onFeatureFlags: vi.fn(() => () => {}) }));
vi.mock('posthog-js', () => ({ default: sdk }));
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-image={String(props.src)} role="img" aria-label={String(props.alt)} /> }));
vi.mock('@/app/(site)/contact-agent/actions', () => ({ submitContactAgentLead: vi.fn() }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/leads/customer-navigation', () => ({ navigateCustomerSuccess: vi.fn() }));
vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(), formTrackingPayload: () => ({}), trackFormStarted: vi.fn(),
  trackFormSubmitAttempted: vi.fn(), trackFormSubmissionFailed: vi.fn(), trackFormValidationFailed: vi.fn(),
}));

const agent = { id: '0014x00000HWTqI', name: 'Fixture Agent', photo: '/images/agents/0014x00000HWTqI.webp', service: 'Army Veteran', brokerage: 'Fixture Realty' };
const scrollTo = vi.fn();
let desktop = true;

function open(url: string, flag: unknown) {
  sdk.flag = flag;
  window.history.replaceState(null, '', url);
  return render(<Page />);
}
const variantOf = (view: ReturnType<typeof render>) => view.container.querySelector('[data-contact-agent-variant]')?.getAttribute('data-contact-agent-variant') ?? null;
function headerClick(ctaId = 'header_desktop_find_agent') {
  const event = new CustomEvent('vpcs:same-page-contact-cta', { cancelable: true, detail: { ctaId } });
  act(() => { window.dispatchEvent(event); });
  return event;
}

beforeEach(() => {
  desktop = true; vi.clearAllMocks();
  sdk.getFeatureFlag.mockImplementation(() => sdk.flag);
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('prefers-reduced-motion') ? false : desktop })));
  vi.stubGlobal('scrollTo', scrollTo);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.sessionStorage.clear(); window.history.replaceState(null, '', '/'); });

describe('desktop-contact-agent-v2 on the contact page', () => {
  it.each([['control', 'control'], [undefined, 'unknown'], [true, 'unknown']])('renders the unchanged page for flag value %o', (flag, applied) => {
    const view = open('/contact-agent?form=agent&fn=Test&id=partner&state=texas', flag);
    expect(variantOf(view)).toBe(applied);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Contact Test');
    expect(view.container.querySelector('[data-selected-agent-panel]')).toBeNull();
    // The link keeps its default behaviour: nobody handles the same-page click.
    expect(headerClick().defaultPrevented).toBe(false);
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('names the chosen agent and shows their listing details in the test variant', () => {
    window.sessionStorage.setItem('vpcs_selected_agent', JSON.stringify(agent));
    const view = open(`/contact-agent?form=agent&fn=Fixture&id=${agent.id}&state=texas`, 'test');
    expect(variantOf(view)).toBe('test');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Contact Fixture Agent');
    const panel = view.container.querySelector('[data-selected-agent-panel]')!;
    expect(panel.textContent).toContain('Army Veteran');
    expect(panel.textContent).toContain('Fixture Realty');
    expect(panel.querySelector('[data-image]')?.getAttribute('data-image')).toBe(agent.photo);
  });

  it('falls back to the first name, then to the generic heading, without a hand-off', () => {
    open('/contact-agent?form=agent&fn=Test&id=unknown-agent&state=texas', 'test');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Contact Test');
    cleanup();
    const view = open('/contact-agent', 'test');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain("Tell us where you're moving. We'll match you with an agent.");
    expect(view.container.querySelector('[data-selected-agent-panel]')).toBeNull();
  });

  it('reveals the form on a header click without registering a form start', () => {
    const start = '/contact-agent?form=agent&fn=Test&id=partner&state=texas';
    open(start, 'test');
    const event = headerClick();
    expect(event.defaultPrevented).toBe(true);
    const region = document.getElementById('contact-agent-form')!;
    // Focus lands on the wrapper around the form, never inside it.
    expect(document.activeElement).toBe(region);
    expect(region.querySelector('form')).not.toBeNull();
    expect(region.closest('form')).toBeNull();
    expect(trackFormStarted).not.toHaveBeenCalled();
    expect(region.hasAttribute('data-highlight')).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(window.location.pathname + window.location.search).toBe(start);
    expect(captureAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(captureAnalyticsEvent).toHaveBeenCalledWith('cta_clicked', expect.objectContaining({ cta_id: 'contact_agent_header_scroll', destination_path: '/contact-agent' }));

    // A form start is still, and only, the visitor entering a field themselves.
    fireEvent.focus(document.getElementById('firstName')!);
    expect(trackFormStarted).toHaveBeenCalledTimes(1);
    expect(trackFormStarted).toHaveBeenCalledWith('contact_agent');
  });

  it('leaves footer links and non-desktop devices on the default behaviour', () => {
    open('/contact-agent?form=agent&fn=Test&id=partner&state=texas', 'test');
    expect(headerClick('footer_explore_find_an_agent').defaultPrevented).toBe(false);
    desktop = false;
    expect(headerClick().defaultPrevented).toBe(false);
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
    expect(trackFormStarted).not.toHaveBeenCalled();
  });

  it('records an exposure only on a desktop-class device with a known variant', () => {
    open('/contact-agent', 'test');
    expect(sdk.onFeatureFlags).toHaveBeenCalled();
    cleanup(); sdk.onFeatureFlags.mockClear();
    desktop = false; open('/contact-agent', 'test');
    cleanup();
    desktop = true; open('/contact-agent', undefined);
    expect(sdk.onFeatureFlags).not.toHaveBeenCalled();
  });
});
