type ContactForm = 'agent' | 'lender';

type Args = {
  firstName?: string | null;
  salesforceId?: string | null;
  stateSlug?: string | null;
  form?: ContactForm;
};

export function buildContactCtaHref({
  firstName,
  salesforceId,
  stateSlug,
  form = 'agent',
}: Args): string {
  // Keep the route and the form param in lock-step so a lender is never sent to
  // the agent contact flow (which would record an agent lead in Salesforce).
  const route = form === 'lender' ? '/contact-lender' : '/contact-agent';
  const params = new URLSearchParams();
  params.set('form', form);
  if (firstName) params.set('fn', firstName);
  if (salesforceId) params.set('id', salesforceId);
  if (stateSlug) params.set('state', stateSlug);
  return `${route}?${params.toString()}`;
}

const CONTACT_AGENT_PATH = '/contact-agent';
const withoutTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * True when a link would re-open the agent contact page the visitor is already on.
 *
 * The page submits the lead with the query string in the address bar, which is where the
 * selected agent (`id`) and state live. Following a same-page link replaces that query, so
 * callers use this to leave the address alone instead of navigating.
 */
export function isSameContactAgentPage(targetHref: unknown, currentPathname: string): boolean {
  if (withoutTrailingSlash(currentPathname) !== CONTACT_AGENT_PATH) return false;
  if (typeof targetHref !== 'string' && !(targetHref instanceof URL)) return false;
  try {
    const base = 'https://www.veteranpcs.com';
    const target = new URL(targetHref, base);
    return target.origin === base && withoutTrailingSlash(target.pathname) === CONTACT_AGENT_PATH;
  } catch {
    return false;
  }
}
