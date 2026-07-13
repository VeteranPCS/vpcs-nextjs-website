import { describe, expect, it } from 'vitest';
import { buildBlogItemList, buildCollectionPage, buildWebSite } from '@/lib/structured-data';

describe('buildBlogItemList', () => {
  it('builds an ItemList with 1-based sequential positions', () => {
    const itemList = buildBlogItemList({
      url: 'https://veteranpcs.com/blog',
      name: 'PCS Guides',
      items: [
        { url: 'https://veteranpcs.com/blog/a', name: 'Post A' },
        { url: 'https://veteranpcs.com/blog/b', name: 'Post B' },
        { url: 'https://veteranpcs.com/blog/c', name: 'Post C' },
      ],
    });

    expect(itemList['@type']).toBe('ItemList');
    expect(itemList.numberOfItems).toBe(3);
    const elements = itemList.itemListElement as unknown as Array<{ position: number; name: string; item: string }>;
    expect(elements.map((element) => element.position)).toEqual([1, 2, 3]);
    expect(elements[0]?.name).toBe('Post A');
    expect(elements[0]?.item).toBe('https://veteranpcs.com/blog/a');
  });
});

describe('buildCollectionPage', () => {
  it('carries url, name, and description', () => {
    const page = buildCollectionPage({
      url: 'https://veteranpcs.com/blog/pcs-help',
      name: 'PCS Help Guides',
      description: 'PCS planning guides for military families.',
    });

    expect(page['@type']).toBe('CollectionPage');
    expect(page.url).toBe('https://veteranpcs.com/blog/pcs-help');
    expect(page.name).toBe('PCS Help Guides');
    expect(page.description).toBe('PCS planning guides for military families.');
  });

  it('embeds an ItemList as mainEntity when provided', () => {
    const itemList = buildBlogItemList({
      url: 'https://veteranpcs.com/blog',
      name: 'Guides',
      items: [{ url: 'https://veteranpcs.com/blog/a', name: 'Post A' }],
    });
    const page = buildCollectionPage({
      url: 'https://veteranpcs.com/blog',
      name: 'Guides',
      itemList,
    });
    expect(page.mainEntity).toBe(itemList);
  });
});

describe('buildWebSite SearchAction', () => {
  it('uses the query param the live blog search form submits', () => {
    const site = buildWebSite();
    const action = site.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toContain('query={search_term_string}');
    expect(action.target.urlTemplate).not.toContain('?q=');
  });
});
