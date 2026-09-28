import React, { isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import StatePageCTA from '../StatePageCTA/StatePageCTA';
import StatePageLetFindAgent from '../StatePageLetFindAgent/StatePageLetFindAgent';
import StatePageCityAgents from '../StatePageCityAgents/StatePageCityAgents';
import StatePageVaLoan from '../StatePageVaLoan/StatePageVaLoan';
import { trackCtaClicked } from '@/lib/analytics/client';
import type { Agent, Lenders } from '@/services/stateService';

vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: vi.fn() }));

type LinkProps = { children?: ReactNode; href?: string; onClick?: () => void };
function contactLinks(node: ReactNode): LinkProps[] {
  if (Array.isArray(node)) return node.flatMap(contactLinks);
  if (!isValidElement<LinkProps>(node)) return [];
  const { props } = node;
  return [
    ...(props.href?.startsWith('/contact-') ? [props] : []),
    ...contactLinks(props.children),
  ];
}

describe('state contact CTA wiring', () => {
  it('preserves the state in every generic contact destination and emitted click', () => {
    const links = [
      ...contactLinks(StatePageCTA({ cityName: 'Texas', stateSlug: 'texas' })),
      ...contactLinks(StatePageLetFindAgent({ stateSlug: 'texas', stateCode: 'TX' })),
    ];
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(new URL(link.href!, 'https://www.veteranpcs.com').searchParams.get('state')).toBe('texas'); // Contact links have href by construction.
      link.onClick?.();
      expect(trackCtaClicked).toHaveBeenLastCalledWith(expect.objectContaining({ page_type: 'state_page', state_code: 'TX', state_slug: 'texas' }));
    }
  });

  it('tracks image, button, and heading clicks for both partner card types', () => {
    const partner = { FirstName: 'Fixture', AccountId_15__c: 'partner-fixture', Name: 'Fixture Partner' };
    const trees = [
      StatePageCityAgents({ city: 'Austin', state: 'texas', agent_data: [partner as Agent] }),
      StatePageVaLoan({ cityName: 'Texas', state: 'texas', lendersData: { totalSize: 1, done: true, records: [partner as Lenders] } }),
    ];
    for (const [index, tree] of trees.entries()) {
      const links = contactLinks(tree);
      expect(links).toHaveLength(3);
      for (const link of links) {
        link.onClick?.();
        expect(trackCtaClicked).toHaveBeenLastCalledWith(expect.objectContaining({
          page_type: 'state_page', state_code: 'TX', state_slug: 'texas',
          partner_type: index === 0 ? 'agent' : 'lender', partner_salesforce_id: 'partner-fixture',
        }));
      }
    }
  });
});
