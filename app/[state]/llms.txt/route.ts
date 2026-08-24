import stateService, { type Agent, type Lenders } from '@/services/stateService';
import { fetchStatePageData } from '@/services/statePageService';
import { SITE_URL } from '@/lib/siteUrl';
import { getStateGuidePosts } from '@/lib/blog/registry';
import { areaAssignmentsInState } from '@/lib/stateAgents';
import { getStateBySlug } from '@/lib/content/states';

export const revalidate = 43200;

const BASE_URL = SITE_URL;

export async function generateStaticParams() {
  const states = await stateService.fetchStateList();
  return states.map((state) => ({ state: state.state_slug.current }));
}

function agentCitiesInState(agent: Agent, stateSlugInput: string): string {
  const cities = areaAssignmentsInState(agent, stateSlugInput)
    .map((r) => r.Area__r?.Name)
    .filter((name): name is string => Boolean(name));
  const unique = Array.from(new Set(cities));
  return unique.length ? unique.join(', ') : '—';
}

function formatAgentLine(agent: Agent, stateSlugInput: string): string {
  const name = agent.Name || `${agent.FirstName ?? ''} ${agent.LastName ?? ''}`.trim() || '—';
  const brokerage = agent.Brokerage_Name__pc || '—';
  const cities = agentCitiesInState(agent, stateSlugInput);
  const status = agent.Military_Status__pc || '—';
  return `- ${name} — ${brokerage} — ${cities} — ${status}`;
}

function formatLenderLine(lender: Lenders): string {
  const name = lender.Name || '—';
  const brokerage = lender.Brokerage_Name__pc || '—';
  const city = lender.BillingCity || '—';
  const nmls = lender.Individual_NMLS_ID__pc || '—';
  return `- ${name} — ${brokerage} — ${city} — NMLS: ${nmls}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ state: string }> },
) {
  const { state } = await params;

  if (!getStateBySlug(state)) return new Response('Not found', { status: 404 });

  const {
    stateDetails: stateDetail,
    agentsData,
    lendersData,
  } = await fetchStatePageData(state);

  const stateName = stateDetail.state_name;
  const shortName = stateDetail.short_name ?? '';
  const slug = stateDetail.state_slug?.current ?? state;
  const pageUrl = `${BASE_URL}/${slug}`;

  const agents = agentsData.records;
  const lenders = lendersData.records;

  const relatedBlogs = getStateGuidePosts(slug, 20);

  const lines: string[] = [];
  lines.push(`# VeteranPCS — ${stateName}`);
  lines.push('');
  lines.push('> Per-state digest for LLM ingestion. State pages at /<slug>. Full content at /llms-full.txt.');
  lines.push('');
  lines.push('## Overview');
  lines.push(`- Slug: ${slug}`);
  lines.push(`- State code: ${shortName}`);
  lines.push(`- Page: ${pageUrl}`);
  lines.push('');
  lines.push(`## Agents (${agents.length})`);
  lines.push('');
  for (const a of agents) lines.push(formatAgentLine(a, slug));
  lines.push('');
  lines.push(`## Lenders (${lenders.length})`);
  lines.push('');
  for (const l of lenders) lines.push(formatLenderLine(l));
  lines.push('');
  lines.push(`## Related Blog Posts (${relatedBlogs.length})`);
  lines.push('');
  for (const b of relatedBlogs) {
    const url = `${BASE_URL}/blog/${b.slug}`;
    lines.push(`- ${b.title} — ${url} — ${url}/page.md`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600',
    },
  });
}
