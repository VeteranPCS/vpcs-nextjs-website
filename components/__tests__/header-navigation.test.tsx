// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import Link from 'next/link';
import { ImpactProvider } from '../redesign/ImpactProvider';
import { navigation } from '../navigation/model';
import fs from 'node:fs';
import path from 'node:path';

let pathname = '/';
let desktop = false;
let mediaListener: (() => void) | undefined;
const track = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
// The image mock forwards Next's alt attribute while omitting its non-DOM priority prop.
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: Record<string, unknown>) => <img {...props} /> }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: (...args: unknown[]) => track(...args) }));

beforeEach(() => {
  desktop = false; pathname = '/'; track.mockClear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return desktop; }, addEventListener: (_event: string, cb: () => void) => { mediaListener = cb; }, removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { available: false, cashBackAmount: '$500,000', charityAmount: '$50,000', totalVolumeSold: '$189 Million' } }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.body.style.overflow = ''; document.documentElement.style.overflow = ''; });

function openMobile() { fireEvent.click(screen.getByRole('button', { name: 'Open navigation' })); return screen.getByRole('dialog', { name: 'Mobile navigation' }); }

describe('Header navigation', () => {
  it('opens the mobile root, drills into resources, and returns focus to the selected row on Back', () => {
    render(<ImpactProvider><Header /></ImpactProvider>);
    const dialog = openMobile();
    expect(document.body.style.overflow).toBe('hidden');
    const resources = within(dialog).getByRole('button', { name: 'PCS Resources' });
    fireEvent.click(resources);
    const back = within(dialog).getByRole('button', { name: /Back/ });
    expect(document.activeElement).toBe(back);
    expect(within(dialog).getByRole('link', { name: 'Ultimate PCS Checklist & Timeline' }).getAttribute('href')).toBe('/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel');
    expect(within(dialog).getByRole('link', { name: 'Explore Free Guides' }).getAttribute('href')).toBe('/guides');
    fireEvent.click(back);
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'PCS Resources' }));
    expect(within(dialog).getByRole('button', { name: 'Mission' })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'About' })).toBeNull();
  });

  it('pairs mobile badges and Mission links with their source semantic motifs', () => {
    render(<ImpactProvider><Header /></ImpactProvider>);
    const dialog = openMobile();
    for (const [label, icon] of [['VA Loan', 'loan'], ['PCS Resources', 'resources'], ['Mission', 'mission'], ['Contact', 'contact']] as const) {
      expect(within(dialog).getByRole('button', { name: label }).querySelector('svg')?.getAttribute('data-root-icon')).toBe(icon);
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mission' }));
    for (const [label, icon] of [['Our Story', 'home'], ['Meet Our Team', 'people'], ['Our Impact', 'giving'], ['Success Stories', 'chat']] as const) {
      const link = within(dialog).getAllByRole('link', { name: new RegExp(label) }).find((element) => element.closest('li'));
      expect(link?.closest('li')?.querySelector('svg')?.getAttribute('data-menu-icon')).toBe(icon);
    }
  });

  it('traps focus in the mobile drawer and restores focus and prior scroll state on Escape', async () => {
    document.body.style.overflow = 'clip'; document.documentElement.style.overflow = 'auto';
    render(<ImpactProvider><Header /></ImpactProvider>);
    const dialog = openMobile();
    const toggle = screen.getByRole('button', { name: 'Close navigation' });
    toggle.focus(); fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'VA Loan' }));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open navigation' })));
    expect(document.body.style.overflow).toBe('clip'); expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('closes on route change, breakpoint change, and unmount while releasing scroll lock', () => {
    const view = render(<ImpactProvider><Header /></ImpactProvider>); openMobile();
    pathname = '/about'; view.rerender(<ImpactProvider><Header /></ImpactProvider>);
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.body.style.overflow).toBe('');
    openMobile(); act(() => { desktop = true; mediaListener?.(); });
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.body.style.overflow).toBe('');
    act(() => { desktop = false; mediaListener?.(); }); openMobile(); view.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('makes the page inert only while the mobile dialog is open and restores its prior state', () => {
    render(<><ImpactProvider><Header /></ImpactProvider><main>Page content</main><footer>Footer content</footer></>);
    const main = screen.getByRole('main'); const footer = screen.getByRole('contentinfo');
    main.inert = false; footer.inert = true;
    openMobile(); expect(main.inert).toBe(true); expect(footer.inert).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(main.inert).toBe(false); expect(footer.inert).toBe(true);
  });

  it('also makes div-based legacy pages and floating widgets inert, preserving prior values', () => {
    render(<><ImpactProvider><Header /></ImpactProvider><div className="site-header-addition" data-testid="legacy"><Link href="/about">Legacy page link</Link></div><button>Floating chat</button></>);
    const legacy = screen.getByTestId('legacy');
    const widget = screen.getByRole('button', { name: 'Floating chat' });
    legacy.inert = false; widget.inert = true;
    openMobile();
    expect(legacy.inert).toBe(true); expect(widget.inert).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(legacy.inert).toBe(false); expect(widget.inert).toBe(true);
  });

  it('opens desktop menus by keyboard, dismisses with Escape/outside pointer, and switches menus', () => {
    desktop = true; render(<ImpactProvider><Header /></ImpactProvider>);
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const resources = within(nav).getByRole('button', { name: 'PCS Resources' });
    fireEvent.keyDown(resources, { key: 'ArrowDown' });
    expect(resources.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('PCS Resources navigation').hidden).toBe(false);
    const mission = within(nav).getByRole('button', { name: 'Mission' }); fireEvent.click(mission);
    expect(resources.getAttribute('aria-expanded')).toBe('false'); expect(mission.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' }); expect(document.activeElement).toBe(mission);
    expect(mission.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(mission); fireEvent.pointerDown(document.body);
    expect(mission.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps tracked agent/lender links and real contact channels', () => {
    render(<ImpactProvider><Header /></ImpactProvider>); let dialog = openMobile();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Contact' }));
    expect(within(dialog).getByRole('link', { name: '719-782-5065' }).getAttribute('href')).toBe('tel:7197825065');
    expect(within(dialog).getByRole('link', { name: 'info@veteranpcs.com' }).getAttribute('href')).toBe('mailto:info@veteranpcs.com');
    fireEvent.click(within(dialog).getByRole('link', { name: 'Contact a VA Loan Expert' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ cta_intent: 'contact_lender', destination_path: '/contact-lender' }));
    dialog = openMobile(); fireEvent.click(within(dialog).getByRole('link', { name: 'Find an Agent' }));
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ cta_intent: 'contact_agent', cta_id: 'header_mobile_find_agent', destination_path: '/contact-agent' }));
  });

  it('never displays unavailable numeric impact fallbacks', async () => {
    render(<ImpactProvider><Header /></ImpactProvider>);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText('$500,000')).toBeNull(); expect(screen.queryByText('$50,000')).toBeNull();
    expect(screen.getAllByText('Giving back').length).toBeGreaterThan(0);
  });

  it('displays impact figures only when the API marks them available', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { available: true, cashBackAmount: '$712,345', charityAmount: '$67,890', totalVolumeSold: '$211 Million' } }) } as Response);
    render(<ImpactProvider><Header /></ImpactProvider>);
    await screen.findAllByText('$712,345');
    const dialog = openMobile(); fireEvent.click(within(dialog).getByRole('button', { name: 'Mission' }));
    expect(within(dialog).getByText('$67,890')).toBeTruthy();
  });

  it('only models routes, downloadable guide anchors, and published articles that exist', () => {
    for (const section of navigation) for (const group of section.groups) for (const item of group.items) {
      const route = item.href.split('#')[0];
      expect(route).toBeTruthy();
      if (route?.startsWith('/blog/category/')) continue;
      const file = route?.startsWith('/blog/') ? path.join(process.cwd(), 'content', `${route.slice(1)}.mdx`) : path.join(process.cwd(), 'app/(site)', route?.slice(1) ?? '', 'page.tsx');
      expect(fs.existsSync(file), `${item.label}: ${item.href}`).toBe(true);
    }
  });
});
