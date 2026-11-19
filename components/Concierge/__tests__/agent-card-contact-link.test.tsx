// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AgentCard from '../AgentCard';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';

vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: vi.fn() }));

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('Concierge agent card on the agent contact page', () => {
  it('lets "Start intake" for another agent navigate while a different agent is selected', () => {
    // The visitor arrived for agent A; the Concierge then recommends agent B.
    window.history.replaceState(null, '', '/contact-agent?form=agent&fn=Alpha&id=partner-a&state=texas');
    const scrollTo = vi.fn(); vi.stubGlobal('scrollTo', scrollTo);
    try {
      render(<AgentCard kind="agent" list={[{
        id: 'partner-b', name: 'Bravo Fixture', firstName: 'Bravo',
        contactHref: buildContactCtaHref({ form: 'agent', firstName: 'Bravo', salesforceId: 'partner-b', stateSlug: 'florida' }),
      }]} />);
      const link = screen.getByRole('link', { name: 'Start intake with Bravo' });
      expect(link.getAttribute('href')).toBe('/contact-agent?form=agent&fn=Bravo&id=partner-b&state=florida');
      const click = createEvent.click(link, { button: 0 });
      fireEvent(link, click);
      // Not held on the page: next/link performs the navigation to agent B.
      expect(click.defaultPrevented).toBe(false);
      expect(scrollTo).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
