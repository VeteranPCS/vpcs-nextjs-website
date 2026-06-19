import { NextRequest, NextResponse } from 'next/server';
import stateService from '@/services/stateService';
import { normalizeStateCode, normalizeStateSlug } from '@/lib/states';
import { buildAgentContactHref, topAgentForArea } from '@/lib/stateAgents';

type AreaAgentResponse = {
  success: boolean;
  data?: {
    firstName: string;
    salesforceId: string;
    stateSlug: string;
    contactHref: string;
  };
  error?: 'Invalid state' | 'Area parameter is required' | 'Invalid area' | 'No agent found for area' | 'Coverage lookup unavailable';
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> },
): Promise<NextResponse<AreaAgentResponse>> {
  const { state } = await params;
  const stateCode = normalizeStateCode(state);
  const stateSlug = normalizeStateSlug(state);
  if (!stateCode || !stateSlug) {
    return NextResponse.json({ success: false, error: 'Invalid state' }, { status: 400 });
  }

  const area = request.nextUrl.searchParams.get('area')?.trim();
  if (!area) {
    return NextResponse.json({ success: false, error: 'Area parameter is required' }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(area)) {
    return NextResponse.json({ success: false, error: 'Invalid area' }, { status: 400 });
  }

  try {
    const agentsData = await stateService.fetchAgentsListByState(stateCode, { requireHeadshot: false });
    const agent = topAgentForArea(agentsData.records ?? [], stateSlug, area);
    if (!agent) {
      return NextResponse.json({ success: false, error: 'No agent found for area' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        firstName: agent.FirstName,
        salesforceId: agent.AccountId_15__c,
        stateSlug,
        contactHref: buildAgentContactHref(agent, stateSlug),
      },
    });
  } catch (error) {
    console.error('Area-agent lookup failed:', error);
    return NextResponse.json({ success: false, error: 'Coverage lookup unavailable' }, { status: 503 });
  }
}
