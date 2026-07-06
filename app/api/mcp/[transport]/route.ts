import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import stateService from '@/services/stateService';
import { getBlogBySlug, searchBlogs } from '@/lib/blog/mdx';
import { mcpLimiter } from '@/lib/rate-limit';
import { ipFromHeaders } from '@/lib/spam-protection';
import { mcpEnabled, mcpMisconfigured, mcpErrorResult, verifyMcpToken } from '@/lib/mcp/auth';
import { logError } from '@/services/loggingService';

// node:crypto (timingSafeEqual, via lib/mcp/auth) requires the Node runtime.
export const runtime = 'nodejs';
export const maxDuration = 60;

const errorResult = mcpErrorResult;

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'getStates',
      'List all US states VeteranPCS serves. Returns slug, short_name (2-letter), and state_name for each. Use this first to discover valid state slugs for other tools.',
      {},
      async () => {
        try {
          const states = await stateService.fetchStateList();
          const slim = states.map((s) => ({
            slug: s.state_slug?.current,
            short_name: s.short_name,
            state_name: s.state_name,
          }));
          return jsonResult(slim);
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.tool(
      'getStateDetails',
      'Get details for a single state by slug (e.g. "texas"). Returns short_name, state_name, and slug.',
      { state: z.string().describe('State slug, e.g. "texas"') },
      async ({ state }) => {
        try {
          const details = await stateService.fetchStateDetails(state);
          return jsonResult({
            short_name: details.short_name,
            state_name: details.state_name,
            slug: details.state_slug?.current,
          });
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.tool(
      'getAgentsByState',
      'List VeteranPCS real-estate agents serving a state (by slug like "texas"). Returns name, brokerage, military status, cities served, and Salesforce ID.',
      { state: z.string().describe('State slug, e.g. "texas"') },
      async ({ state }) => {
        try {
          const states = await stateService.fetchStateList();
          const match = states.find((s) => s.state_slug?.current === state);
          if (!match) return { content: [{ type: 'text' as const, text: `No state found for slug "${state}"` }] };
          const data = await stateService.fetchAgentsListByState(match.short_name);
          const slim = data.records.map((a) => ({
            name: a.Name,
            brokerage: a.Brokerage_Name__pc,
            militaryStatus: a.Military_Status__pc,
            cities: (a.Area_Assignments__r?.records ?? [])
              .filter((r) => r.Area__r?.State__c === match.short_name)
              .map((r) => r.Area__r.Name),
            salesforceId: a.AccountId_15__c,
          }));
          return jsonResult(slim);
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.tool(
      'getLendersByState',
      'List VeteranPCS mortgage lenders serving a state (by slug like "texas"). Returns name, brokerage, military status, city, NMLS ID, and Salesforce ID.',
      { state: z.string().describe('State slug, e.g. "texas"') },
      async ({ state }) => {
        try {
          const states = await stateService.fetchStateList();
          const match = states.find((s) => s.state_slug?.current === state);
          if (!match) return { content: [{ type: 'text' as const, text: `No state found for slug "${state}"` }] };
          const data = await stateService.fetchLendersListByState(match.short_name);
          const slim = data.records.map((l) => ({
            name: l.Name,
            brokerage: l.Brokerage_Name__pc,
            militaryStatus: l.Military_Status__pc,
            city: l.BillingCity,
            nmlsId: l.Individual_NMLS_ID__pc ?? l.Company_NMLS_ID__pc,
            salesforceId: l.AccountId_15__c,
          }));
          return jsonResult(slim);
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.tool(
      'getBlogPost',
      'Fetch a single VeteranPCS blog post by slug. Returns frontmatter (title, metaDescription, publishedAt, categories, author, etc.) plus the full MDX body.',
      { slug: z.string().describe('Blog post slug') },
      async ({ slug }) => {
        try {
          const post = await getBlogBySlug(slug);
          if (!post) return { content: [{ type: 'text' as const, text: 'Blog post not found' }] };
          const { filepath, ...rest } = post;
          return jsonResult(rest);
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.tool(
      'searchBlog',
      'Search VeteranPCS blog posts by keyword (matches title or body). Returns a slim list with title, slug, metaDescription, publishedAt, and URL.',
      {
        query: z.string().describe('Search keyword(s)'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results (default 5, max 20)'),
      },
      async ({ query, limit }) => {
        try {
          const results = await searchBlogs(query);
          const capped = results.slice(0, limit ?? 5);
          const slim = capped.map((p) => ({
            title: p.title,
            slug: p.slug,
            metaDescription: p.metaDescription,
            publishedAt: p.publishedAt,
            url: `https://veteranpcs.com/blog/${p.slug}`,
          }));
          return jsonResult(slim);
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  },
  {},
  { basePath: '/api/mcp' },
);

// withMcpAuth's default is `required: false` (fail-OPEN). We MUST pass an explicit
// `required: true` so a missing/invalid bearer becomes a 401 instead of an
// unauthenticated pass-through. verifyMcpToken constant-time-compares against
// MCP_AUTH_TOKEN and returns undefined on any mismatch.
const authedHandler = withMcpAuth(
  handler,
  (_req, bearer) => verifyMcpToken(bearer),
  { required: true },
);

// Route entry: flag gate -> fail-closed misconfig guard -> IP rate-limit -> auth.
async function guardedHandler(req: Request): Promise<Response> {
  if (!mcpEnabled()) {
    return new Response('Not found', { status: 404 });
  }

  if (mcpMisconfigured()) {
    logError('MCP: MCP_ENABLED is on but MCP_AUTH_TOKEN is unset — failing closed');
    return new Response('MCP is temporarily unavailable.', { status: 503 });
  }

  const ip = ipFromHeaders(req.headers);
  const limit = await mcpLimiter.limit(ip);
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  return authedHandler(req);
}

export { guardedHandler as GET, guardedHandler as POST, guardedHandler as DELETE };
