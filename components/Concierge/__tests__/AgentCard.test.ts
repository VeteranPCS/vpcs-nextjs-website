import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AgentCard, { type AgentListItem } from '@/components/Concierge/AgentCard';

const basePartner = {
  brokerage: 'A very long brokerage name that should not be allowed to break the card layout',
  city: 'Colorado Springs',
  militaryStatus: 'Veteran',
  militaryService: 'Army',
  bio: 'This partner has a long relocation bio that should be clamped in the card instead of expanding forever on a small phone screen.',
  stateName: 'Colorado',
  profileHref: '/colorado#colorado-springs',
};

describe('AgentCard', () => {
  it('renders at most three actionable cards with fallback initials and safe links', () => {
    const list: AgentListItem[] = [
      {
        ...basePartner,
        id: '1',
        name: 'Alex Agent',
        firstName: 'Alex',
        contactHref: '/contact-agent?form=agent&fn=Alex&id=1&state=colorado',
      },
      {
        ...basePartner,
        id: '2',
        name: 'Bailey Broker',
        firstName: 'Bailey',
        contactHref: '/contact-agent?form=agent&fn=Bailey&id=2&state=colorado',
      },
      {
        ...basePartner,
        id: '3',
        name: 'Casey Closer',
        firstName: 'Casey',
        contactHref: '/contact-agent?form=agent&fn=Casey&id=3&state=colorado',
      },
      {
        ...basePartner,
        id: '4',
        name: 'Fourth Partner',
        firstName: 'Fourth',
        contactHref: '/contact-agent?form=agent&fn=Fourth&id=4&state=colorado',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(AgentCard, { list, kind: 'agent' }),
    );

    expect(html).toContain('Top agents for you');
    expect(html).toContain('Alex Agent');
    expect(html).toContain('AA');
    expect(html).toContain('Start intake with Alex');
    expect(html).toContain('/contact-agent?form=agent&amp;fn=Alex&amp;id=1&amp;state=colorado');
    expect(html).toContain('/colorado#colorado-springs');
    expect(html).toContain('[-webkit-line-clamp:2]');
    expect(html).not.toContain('Fourth Partner');
    expect(html).not.toContain('**');
  });

  it('renders a useful empty state', () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentCard, { list: [], kind: 'lender' }),
    );

    expect(html).toContain('No matches available right now');
  });
});
