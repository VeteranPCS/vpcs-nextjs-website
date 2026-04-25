type Args = {
  firstName?: string | null;
  salesforceId?: string | null;
  stateSlug?: string | null;
  form?: string;
};

export function buildContactCtaHref({
  firstName,
  salesforceId,
  stateSlug,
  form = 'agent',
}: Args): string {
  const params = new URLSearchParams();
  params.set('form', form);
  if (firstName) params.set('fn', firstName);
  if (salesforceId) params.set('id', salesforceId);
  if (stateSlug) params.set('state', stateSlug);
  return `/contact-agent?${params.toString()}`;
}
