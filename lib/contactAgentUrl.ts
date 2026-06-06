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
