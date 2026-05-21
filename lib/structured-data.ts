import type {
  BreadcrumbList,
  FAQPage,
  ItemList,
  LocalBusiness,
  Person,
  WebSite,
  WithContext,
} from 'schema-dts';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://veteranpcs.com';

type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbList(items: BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

type FaqItem = { question: string; answer: string };

export function buildFaqPage(items: FaqItem[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

type LocalBusinessInput = {
  stateName: string;
  stateSlug: string;
  agentCount: number;
  lenderCount: number;
};

export function buildStateLocalBusiness(input: LocalBusinessInput): WithContext<LocalBusiness> {
  const { stateName, stateSlug, agentCount, lenderCount } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${BASE_URL}/${stateSlug}`,
    name: `VeteranPCS — ${stateName}`,
    description: `Military-experienced real estate agents and VA loan experts serving ${stateName}. ${agentCount} agents and ${lenderCount} lenders in our network.`,
    url: `${BASE_URL}/${stateSlug}`,
    telephone: '+1-719-445-7845',
    areaServed: {
      '@type': 'State',
      name: stateName,
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'VeteranPCS',
      url: BASE_URL,
    },
    priceRange: 'Free',
  };
}

type AgentPersonInput = {
  name: string;
  brokerage?: string | null;
  bio?: string | null;
  stateSlug: string;
  imageUrl?: string | null;
  salesforceId: string;
};

export function buildAgentPerson(input: AgentPersonInput): Person {
  const { name, brokerage, bio, stateSlug, imageUrl, salesforceId } = input;
  return {
    '@type': 'Person',
    '@id': `${BASE_URL}/${stateSlug}#agent-${salesforceId}`,
    name,
    jobTitle: 'Real Estate Agent',
    worksFor: brokerage ? { '@type': 'Organization', name: brokerage } : undefined,
    description: bio ?? undefined,
    image: imageUrl ? `${BASE_URL}${imageUrl}` : undefined,
    memberOf: {
      '@type': 'Organization',
      name: 'VeteranPCS',
      url: BASE_URL,
    },
  };
}

export function buildAgentItemList(
  stateSlug: string,
  agents: AgentPersonInput[],
): WithContext<ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${BASE_URL}/${stateSlug}#agents`,
    name: 'Veteran Real Estate Agents',
    numberOfItems: agents.length,
    itemListElement: agents.map((agent, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: buildAgentPerson(agent),
    })),
  };
}

export function buildWebSite(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'VeteranPCS',
    publisher: {
      '@type': 'Organization',
      name: 'VeteranPCS',
      url: BASE_URL,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/blog-search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    } as WithContext<WebSite>['potentialAction'],
  };
}
