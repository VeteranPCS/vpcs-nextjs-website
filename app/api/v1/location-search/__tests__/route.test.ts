import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
const fetchAgents = vi.hoisted(() => vi.fn());
vi.mock('@/services/stateService', () => ({ default: { fetchAgentsListByState: fetchAgents } }));
import { GET } from '../route';
const get = async (query: string, state?: string) => {
  const params = new URLSearchParams({ query }); if (state) params.set('state', state);
  return (await GET(new NextRequest(`http://localhost/api/v1/location-search?${params}`))).json();
};
describe('location search', () => {
  beforeEach(() => { fetchAgents.mockReset(); fetchAgents.mockResolvedValue({ records: [] }); });
  it.each(['Texas', 'TX', 'texas'])('routes state %s without a CRM request', async (query) => {
    expect(await get(query)).toMatchObject({ outcome: 'resolved', href: '/texas', stateSlug: 'texas' });
    expect(fetchAgents).not.toHaveBeenCalled();
  });
  it('asks for state for an ambiguous city and resolves the retained query with a hint', async () => {
    expect(await get('Springfield')).toMatchObject({ outcome: 'needs_state' });
    expect(await get('Springfield', 'VA')).toMatchObject({ outcome: 'resolved', href: '/virginia' });
  });
  it('adds an anchor only for a rendered agent group in the destination state', async () => {
    fetchAgents.mockResolvedValue({ records: [{ AccountId_15__c: 'agent', Area_Assignments__r: { records: [{ Area__r: { Name: 'Colorado Springs', State__c: 'Colorado' } }] } }] });
    expect(await get('Fort Carson')).toMatchObject({ href: '/colorado#colorado-springs' });
    expect(fetchAgents).toHaveBeenCalledWith('CO');
  });
  it('routes cities and ZIPs to their state without invented anchors', async () => {
    expect(await get('San Diego, CA')).toMatchObject({ href: '/california' });
    expect(await get('80301')).toMatchObject({ href: '/colorado' });
  });
  it('falls back to the state route when Salesforce is unavailable', async () => {
    fetchAgents.mockRejectedValue(new Error('CRM down'));
    expect(await get('Fort Carson')).toMatchObject({ href: '/colorado' });
  });
  it.each(['', '99999', 'NoSuchCity, TX', 'x'.repeat(121)])('handles missing or unknown locations', async (query) => {
    expect(await get(query)).toMatchObject({ outcome: 'not_found' });
  });
});
