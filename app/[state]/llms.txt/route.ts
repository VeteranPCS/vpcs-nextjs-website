import stateService, { type Agent, type Lenders } from '@/services/stateService';
import { getAllBlogs } from '@/lib/blog/mdx';

export const revalidate = 43200;

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://veteranpcs.com';

export async function generateStaticParams() {
  try {
    const states = await stateService.fetchStateList();
    return states
      .map((s) => s.state_slug?.current)
      .filter((slug): slug is string => Boolean(slug))
      .map((state) => ({ state }));
  } catch {
    return [];
  }
}

function agentCitiesInState(agent: Agent, stateCode: string): string {
  const records = agent.Area_Assignments__r?.records ?? [];
  const cities = records
    .filter((r) => r.Area__r?.State__c === stateCode)
    .map((r) => r.Area__r?.Name)
    .filter((name): name is string => Boolean(name));
  const unique = Array.from(new Set(cities));
  return unique.length ? unique.join(', ') : '—';
}

function formatAgentLine(agent: Agent, stateCode: string): string {
  const name = agent.Name || `${agent.FirstName ?? ''} ${agent.LastName ?? ''}`.trim() || '—';
  const brokerage = agent.Brokerage_Name__pc || '—';
  const cities = agentCitiesInState(agent, stateCode);
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

  let stateDetail: Awaited<ReturnType<typeof stateService.fetchStateDetails>> | null = null;
  try {
    stateDetail = await stateService.fetchStateDetails(state);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!stateDetail) return new Response('Not found', { status: 404 });

  const stateName = stateDetail.state_name;
  const shortName = stateDetail.short_name;
  const slug = stateDetail.state_slug?.current ?? state;
  const pageUrl = `${BASE_URL}/${slug}`;

  let agents: Agent[] = [];
  try {
    const agentsData = await stateService.fetchAgentsListByState(shortName);
    agents = agentsData?.records ?? [];
  } catch (err) {
    console.error('[llms.txt] agents fetch failed:', err);
  }

  let lenders: Lenders[] = [];
  try {
    const lendersData = await stateService.fetchLendersListByState(shortName);
    lenders = lendersData?.records ?? [];
  } catch (err) {
    console.error('[llms.txt] lenders fetch failed:', err);
  }

  let relatedBlogs: { title: string; slug: string }[] = [];
  try {
    const all = await getAllBlogs();
    const needle = stateName.toLowerCase();
    relatedBlogs = all
      .filter((post) => {
        const haystack = [
          post.title,
          post.primaryKeyword ?? '',
          post.slug,
          ...(post.secondaryKeywords ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 20)
      .map((p) => ({ title: p.title, slug: p.slug }));
  } catch (err) {
    console.error('[llms.txt] blogs fetch failed:', err);
  }

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
  for (const a of agents) lines.push(formatAgentLine(a, shortName));
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
