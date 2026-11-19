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

/**
 * Dispatched on `window` (cancelable) when a link back to the agent contact page is clicked
 * on that page. A listener that handles the click calls preventDefault(); otherwise the link
 * returns the visitor to the top of the page.
 */
export const SAME_PAGE_CONTACT_CTA_EVENT = 'vpcs:same-page-contact-cta';
export type SamePageContactCtaDetail = { ctaId: string };

const CONTACT_AGENT_PATH = '/contact-agent';
/** Query parameters that say which agent or state the visitor is asking for. */
const SELECTION_PARAMS = ['id', 'fn', 'state'] as const;
const withoutTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * True when a link clicked on the agent contact page points back at that page WITHOUT naming
 * an agent or state of its own (the header, menu and footer "Find an Agent" links).
 *
 * The page submits the lead with the query string in the address bar, which is where the
 * selected agent (`id`) and state live. Following a generic link would replace that query and
 * drop the selection, so callers leave the address alone instead of navigating.
 *
 * A link that carries its own `id`, `fn` or `state` (a Concierge card's "Start intake", for
 * example) is a deliberate new choice. It is not generic and must navigate; the page follows
 * the new address.
 */
export function isGenericSameContactAgentLink(targetHref: unknown, currentPathname: string): boolean {
  if (withoutTrailingSlash(currentPathname) !== CONTACT_AGENT_PATH) return false;
  if (typeof targetHref !== 'string' && !(targetHref instanceof URL)) return false;
  try {
    const base = 'https://www.veteranpcs.com';
    const target = new URL(targetHref, base);
    if (target.origin !== base || withoutTrailingSlash(target.pathname) !== CONTACT_AGENT_PATH) return false;
    return !SELECTION_PARAMS.some((param) => target.searchParams.has(param));
  } catch {
    return false;
  }
}
