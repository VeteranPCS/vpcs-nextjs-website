import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/stateService', () => {
  const fetchAgentsListByState = vi.fn();
  const fetchLendersListByState = vi.fn();
  return {
    default: {
      fetchAgentsListByState,
      fetchLendersListByState,
    },
  };
});

import stateService from '@/services/stateService';
import { getPartnersForCoverageArea } from '@/lib/ai/routing/partners';

function assignment(areaName: string, stateName: string, score: number) {
  return {
    Id: `${areaName}-${score}`,
    Name: `${areaName} assignment`,
    AA_Score__c: score,
    Area__r: { Name: areaName, State__c: stateName },
  };
}

function agent(name: string, id: string, score: number) {
  const [firstName, lastName] = name.split(' ');
  return {
    Name: name,
    AccountId_15__c: id,
    FirstName: firstName,
    LastName: lastName ?? '',
    Agent_Bio__pc: `${name} has a long but useful military relocation bio for families moving with orders.`,
    Military_Status__pc: 'Veteran',
    Military_Service__pc: 'Army',
    Brokerage_Name__pc: `${firstName} Realty`,
    BillingAddress: { city: 'Round Rock', state: 'TX' },
    BillingStateCode: 'TX',
    State_s_Licensed_in__pc: 'TX',
    PhotoUrl: `/images/agents/${id}.webp`,
    PersonEmail: `${firstName}@example.com`,
    PersonMobilePhone: '555-555-5555',
    Area_Assignments__r: {
      records: [assignment('Austin', 'Texas', score)],
    },
  };
}

beforeEach(() => {
  vi.mocked(stateService.fetchAgentsListByState).mockReset();
  vi.mocked(stateService.fetchLendersListByState).mockReset();
});

describe('getPartnersForCoverageArea', () => {
  it('returns top 3 agents by AA_Score for the selected area with public card metadata only', async () => {
    vi.mocked(stateService.fetchAgentsListByState).mockResolvedValue({
      totalSize: 4,
      done: true,
      records: [
        agent('Low Agent', '001LOW', 10),
        agent('Top Agent', '001TOP', 90),
        agent('Mid Agent', '001MID', 70),
        agent('Third Agent', '001THIRD', 40),
      ],
    } as never);

    const res = await getPartnersForCoverageArea('TX', 'Austin', 'agent');

    expect(res?.matchedArea).toBe(true);
    expect(res?.partners.map((partner) => partner.name)).toEqual([
      'Top Agent',
      'Mid Agent',
      'Third Agent',
    ]);
    expect(res?.partners[0]).toMatchObject({
      role: 'agent',
      city: 'Austin',
      stateName: 'Texas',
      photoUrl: '/images/agents/001TOP.webp',
      contactHref: '/contact-agent?form=agent&fn=Top&id=001TOP&state=texas',
      profileHref: '/texas#austin',
      aaScore: 90,
    });
    expect(JSON.stringify(res?.partners)).not.toContain('PersonEmail');
    expect(JSON.stringify(res?.partners)).not.toContain('PersonMobilePhone');
  });

  it('falls back to top state lenders when no lender is ranked in the selected area', async () => {
    vi.mocked(stateService.fetchLendersListByState).mockResolvedValue({
      totalSize: 1,
      done: true,
      records: [
        {
          Name: 'Pat Lender',
          AccountId_15__c: '002PAT',
          FirstName: 'Pat',
          Agent_Bio__pc: 'VA loan specialist.',
          Military_Status__pc: 'Veteran',
          Military_Service__pc: 'Navy',
          Brokerage_Name__pc: 'VetLend',
          BillingCity: 'San Antonio',
          BillingState: 'TX',
          Individual_NMLS_ID__pc: '12345',
          Company_NMLS_ID__pc: '67890',
          PhotoUrl: '/images/lenders/002PAT.webp',
          Area_Assignments__r: {
            records: [assignment('San Antonio', 'Texas', 75)],
          },
        },
      ],
    } as never);

    const res = await getPartnersForCoverageArea('Texas', 'Austin', 'lender');

    expect(res?.matchedArea).toBe(false);
    expect(res?.caveat).toMatch(/top active lenders in Texas/);
    expect(res?.partners).toHaveLength(1);
    expect(res?.partners[0]).toMatchObject({
      role: 'lender',
      name: 'Pat Lender',
      contactHref: '/contact-lender?form=lender&fn=Pat&id=002PAT&state=texas',
      profileHref: '/texas',
    });
  });
});
