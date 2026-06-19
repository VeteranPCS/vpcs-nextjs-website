import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '@/services/stateService';

vi.mock('server-only', () => ({}));

import {
  areaAssignmentsInState,
  areaSlugFromName,
  buildAgentContactHref,
  groupAgentsByAreaForState,
  topAgentForArea,
} from '@/lib/stateAgents';

function agent(overrides: Partial<Agent>): Agent {
  return {
    Id: '001TEST',
    Name: 'Test Agent',
    FirstName: 'Test',
    AccountId_15__c: '001TEST',
    PhotoUrl: '',
    Military_Service__pc: '',
    Agent_Bio__pc: '',
    Military_Status__pc: '',
    BillingState: '',
    BillingCity: '',
    Brokerage_Name__pc: '',
    ...overrides,
  } as Agent;
}

describe('state agent helpers', () => {
  it('matches assignments by full state name, code, slug, and DC variants', () => {
    const record = agent({
      Area_Assignments__r: {
        records: [
          { Id: 'a1', Name: 'Raleigh', AA_Score__c: 9, Area__r: { Name: 'Raleigh', State__c: 'North Carolina' } },
          { Id: 'a2', Name: 'Capitol Hill', AA_Score__c: 7, Area__r: { Name: 'Capitol Hill', State__c: 'District of Columbia' } },
        ],
      },
    });

    expect(areaAssignmentsInState(record, 'NC')).toHaveLength(1);
    expect(areaAssignmentsInState(record, 'north-carolina')).toHaveLength(1);
    expect(areaAssignmentsInState(record, 'Washington, DC')).toHaveLength(1);
  });

  it('groups agents by area and picks the highest score', () => {
    const agents = [
      agent({
        FirstName: 'Lower',
        AccountId_15__c: '001LOWER',
        Area_Assignments__r: {
          records: [{ Id: 'a1', Name: 'Fort Liberty', AA_Score__c: 4, Area__r: { Name: 'Fort Liberty', State__c: 'North Carolina' } }],
        },
      }),
      agent({
        FirstName: 'Higher',
        AccountId_15__c: '001HIGHER',
        Area_Assignments__r: {
          records: [{ Id: 'a2', Name: 'Fort Liberty', AA_Score__c: 8, Area__r: { Name: 'Fort Liberty', State__c: 'NC' } }],
        },
      }),
    ];

    const grouped = groupAgentsByAreaForState(agents, 'north-carolina');
    expect(Object.keys(grouped)).toEqual(['Fort Liberty']);
    expect(grouped['Fort Liberty'].map((entry) => entry.FirstName)).toEqual(['Higher', 'Lower']);
    expect(areaSlugFromName('Fort Liberty')).toBe('fort-liberty');
    expect(topAgentForArea(agents, 'NC', 'fort-liberty')?.FirstName).toBe('Higher');
    expect(buildAgentContactHref(agents[1], 'North Carolina')).toBe(
      '/contact-agent?form=agent&fn=Higher&id=001HIGHER&state=north-carolina',
    );
  });
});
