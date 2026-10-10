import { NextRequest, NextResponse } from 'next/server';
import { resolveDestinationLocation } from '@/lib/ai/routing/destination';
import { groupAgentsByAreaForState } from '@/lib/stateAgents';
import { sanitizeCityName } from '@/utils/sanitizeCityName';
import stateService from '@/services/stateService';
import type { LocationSearchResult } from '@/lib/location-search/types';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const state = request.nextUrl.searchParams.get('state')?.trim();
  const reply = (result: LocationSearchResult) => NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
  if (!query || query.length > 120 || (state?.length ?? 0) > 40) {
    return reply({ outcome: 'not_found', message: 'Enter a city, state, military base, or ZIP code.' });
  }
  const location = resolveDestinationLocation(query, state);
  if (location.type === 'ambiguous') {
    return reply({ outcome: 'needs_state', message: `Which state is ${location.normalizedName} in?`,
      states: location.candidates?.map((candidate) => ({ name: candidate.stateName, code: candidate.stateCode })) ?? [] });
  }
  if (location.type === 'unknown' || !location.stateSlug || !location.stateCode) {
    return reply({ outcome: 'not_found', message: 'We could not find that location. Try a city and state, base, or ZIP code.' });
  }
  let href = `/${location.stateSlug}`;
  // Use the same headshot gate and grouping as the rendered state page. A CRM
  // outage still leaves a useful state-level destination, never a guessed anchor.
  if (location.type !== 'state') {
    try {
      const agents = await stateService.fetchAgentsListByState(location.stateCode);
      const groups = groupAgentsByAreaForState(agents.records, location.stateSlug);
      const city = location.coverageAreaOverride ?? location.normalizedName.replace(/,\s*[A-Z]{2}$/i, '');
      const normalized = city.toLowerCase().replace(/[^a-z0-9]/g, '');
      const group = Object.keys(groups).find((name) => name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized);
      if (group && groups[group]?.length) href += `#${sanitizeCityName(group)}`;
    } catch {
      // A state page is a safe fallback when its current groups cannot be checked.
    }
  }
  return reply({ outcome: 'resolved', href, label: location.normalizedName, stateSlug: location.stateSlug });
}
