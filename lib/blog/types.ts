export type FrontmatterAuthor = {
  salesforceId?: string;
  name?: string;
};

export type BlogFrontmatter = {
  title: string;
  shortTitle?: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  publishedAt: string;
  component: string;
  categories: string[];
  mainImage: { src: string; alt: string };
  author: FrontmatterAuthor;
  sanityId?: string;

  // Plain-language summary used on cards/heroes; metaDescription is for SERP only.
  description?: string;
  // ISO date the post was last meaningfully edited; emitted as JSON-LD dateModified.
  updatedAt?: string;
  // ISO date the freshness pipeline should re-evaluate this post.
  reviewBy?: string;
  // GSC join key for SEO-performance reports.
  primaryKeyword?: string;
  secondaryKeywords?: string[];
};

export type BlogPost = BlogFrontmatter & {
  content: string;
  filepath: string;
};

export type ResolvedAuthor = {
  salesforceId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  city: string | null;
  state: string | null;
  stateSlug: string | null;
  militaryStatus: string | null;
  brokerage: string | null;
  headshotPath: string | null;
  isAgent: boolean;
  isLender: boolean;
  active: boolean;
  matchKind: 'salesforceId' | 'name' | 'fallback';
};
