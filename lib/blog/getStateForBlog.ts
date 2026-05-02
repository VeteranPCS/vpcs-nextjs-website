import { STATE_ABBR_TO_SLUG } from '@/lib/states';

const STATE_SLUGS = new Set(Object.values(STATE_ABBR_TO_SLUG));

const STATE_SLUGS_BY_LENGTH = Array.from(STATE_SLUGS).sort((a, b) => b.length - a.length);

const PREFIXES_REQUIRING_STATE_SUFFIX = ['what-military-bases-are-in-', 'pcsing-to-'];

export function getStateForBlog(slug: string): string | null {
  for (const prefix of PREFIXES_REQUIRING_STATE_SUFFIX) {
    if (slug.startsWith(prefix)) {
      const remainder = slug.slice(prefix.length);
      for (const state of STATE_SLUGS_BY_LENGTH) {
        if (remainder === state || remainder.startsWith(state + '-')) return state;
      }
    }
  }

  for (const state of STATE_SLUGS_BY_LENGTH) {
    if (slug.startsWith(state + '-military-bases')) return state;
  }

  return null;
}

export function getStateDisplayName(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part === 'dc' ? 'D.C.' : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}
