import type { BlogPost } from '@/lib/blog/types';

// Substring-match weight per field. Title dominates; body is a weak signal.
const PHRASE_IN_TITLE_BONUS = 5;

function searchFields(post: BlogPost): Array<{ text: string; weight: number }> {
  return [
    { text: post.title, weight: 8 },
    { text: post.primaryKeyword ?? '', weight: 6 },
    { text: (post.secondaryKeywords ?? []).join(' '), weight: 4 },
    { text: post.description ?? '', weight: 3 },
    { text: post.component, weight: 2 },
    { text: post.categories.join(' '), weight: 2 },
    { text: post.content, weight: 1 },
  ];
}

/**
 * Pure per-post score. AND semantics: every term must match at least one
 * field, otherwise the post scores 0 (excluded). Each term adds the weight of
 * every field it matches; a multi-term phrase found whole in the title adds a
 * flat bonus. Case-insensitive throughout.
 */
export function scoreBlogSearch(post: BlogPost, terms: string[], phrase: string): number {
  if (terms.length === 0) return 0;

  const fields = searchFields(post).map((field) => ({
    text: field.text.toLowerCase(),
    weight: field.weight,
  }));

  let score = 0;
  for (const term of terms) {
    const needle = term.toLowerCase();
    let termScore = 0;
    for (const field of fields) {
      if (field.text.includes(needle)) termScore += field.weight;
    }
    if (termScore === 0) return 0;
    score += termScore;
  }

  if (terms.length >= 2 && post.title.toLowerCase().includes(phrase.toLowerCase())) {
    score += PHRASE_IN_TITLE_BONUS;
  }

  return score;
}

/**
 * Ranked substring search over the blog corpus. Ties break to the newer
 * publishedAt. Empty or whitespace-only queries return no results.
 */
export function rankBlogSearch(blogs: BlogPost[], query: string): BlogPost[] {
  const phrase = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!phrase) return [];
  const terms = phrase.split(' ');

  return blogs
    .map((post) => ({ post, score: scoreBlogSearch(post, terms, phrase) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime();
    })
    .map((entry) => entry.post);
}
