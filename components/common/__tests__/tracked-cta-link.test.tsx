// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrackedCtaLink from '../TrackedCtaLink';

const track = vi.fn();
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: (...args: unknown[]) => track(...args) }));

const selectedAgent = '/contact-agent?form=agent&fn=Test&id=partner-fixture&state=texas';
const cta = { ctaId: 'header_desktop_find_agent', ctaIntent: 'contact_agent', ctaComponent: 'site_header' };
const scrollTo = vi.fn();

function click(init: MouseEventInit = {}) {
  const link = screen.getByRole('link');
  const event = createEvent.click(link, { button: 0, ...init });
  fireEvent(link, event);
  return event;
}

beforeEach(() => { track.mockClear(); scrollTo.mockClear(); vi.stubGlobal('scrollTo', scrollTo); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

describe('TrackedCtaLink on the agent contact page', () => {
  it('keeps the selected agent in the address when a link points back at the page', () => {
    window.history.replaceState(null, '', selectedAgent);
    const onClick = vi.fn();
    render(<TrackedCtaLink href="/contact-agent?form=agent" cta={cta} onClick={onClick}>Find an Agent</TrackedCtaLink>);
    const event = click();
    expect(event.defaultPrevented).toBe(true);
    expect(window.location.pathname + window.location.search).toBe(selectedAgent);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    // Tracking and the caller's handler (the header closes its drawer there) are unchanged.
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ cta_id: 'header_desktop_find_agent', destination_path: '/contact-agent' }));
  });

  it('lets the page handle the click instead of returning to the top', () => {
    window.history.replaceState(null, '', selectedAgent);
    const seen: unknown[] = [];
    const handle = (event: Event) => { seen.push((event as CustomEvent).detail); event.preventDefault(); };
    window.addEventListener('vpcs:same-page-contact-cta', handle);
    try {
      render(<TrackedCtaLink href="/contact-agent?form=agent" cta={cta}>Find an Agent</TrackedCtaLink>);
      expect(click().defaultPrevented).toBe(true);
      expect(seen).toEqual([{ ctaId: 'header_desktop_find_agent' }]);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.pathname + window.location.search).toBe(selectedAgent);
    } finally { window.removeEventListener('vpcs:same-page-contact-cta', handle); }
  });

  it('also covers the bare footer link', () => {
    window.history.replaceState(null, '', selectedAgent);
    render(<TrackedCtaLink href="/contact-agent" cta={cta}>Find an Agent</TrackedCtaLink>);
    expect(click().defaultPrevented).toBe(true);
  });

  it.each([
    ['another agent', '/contact-agent?form=agent&fn=Bravo&id=partner-b&state=florida'],
    ['a state request', '/contact-agent?form=agent&state=florida'],
  ])('lets a link that names %s navigate while an agent is selected', (_name, href) => {
    window.history.replaceState(null, '', selectedAgent);
    render(<TrackedCtaLink href={href} cta={{ ...cta, ctaId: 'concierge_partner_contact' }}>Start intake with Bravo</TrackedCtaLink>);
    expect(click().defaultPrevented).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ cta_id: 'concierge_partner_contact', destination_path: '/contact-agent' }));
  });

  it('navigates normally to the page from anywhere else', () => {
    window.history.replaceState(null, '', '/texas');
    render(<TrackedCtaLink href="/contact-agent?form=agent" cta={cta}>Find an Agent</TrackedCtaLink>);
    expect(click().defaultPrevented).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('navigates normally from the page to other destinations', () => {
    window.history.replaceState(null, '', selectedAgent);
    render(<TrackedCtaLink href="/contact-lender?form=lender" cta={cta}>Find a Lender</TrackedCtaLink>);
    expect(click().defaultPrevented).toBe(false);
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }])('leaves new-tab clicks (%o) to the browser', (init) => {
    window.history.replaceState(null, '', selectedAgent);
    render(<TrackedCtaLink href="/contact-agent?form=agent" cta={cta}>Find an Agent</TrackedCtaLink>);
    expect(click(init).defaultPrevented).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('respects a caller that already handled the click', () => {
    window.history.replaceState(null, '', selectedAgent);
    render(<TrackedCtaLink href="/contact-agent?form=agent" cta={cta} onClick={(event) => event.preventDefault()}>Find an Agent</TrackedCtaLink>);
    click();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
