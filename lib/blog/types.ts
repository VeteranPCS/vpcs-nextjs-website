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
  componentSlug?: string;
  categories: string[];
  mainImage: { src: string; alt: string };
  author: FrontmatterAuthor;
  sanityId?: string;
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
