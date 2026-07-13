import { describe, expect, it } from 'vitest';
import { buildPagedPath, paginationWindow } from '@/lib/blog/pagination';

describe('paginationWindow', () => {
  it('returns a single page with no ellipsis', () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
  });

  it('lists every page when the total is small enough', () => {
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('fills a single-page gap instead of collapsing it to an ellipsis', () => {
    // Between the sibling window {1,2,3} and last page 5 only page 4 is
    // missing, so it is rendered directly.
    expect(paginationWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses a gap of 2+ hidden pages to a single ellipsis', () => {
    expect(paginationWindow(1, 5)).toEqual([1, 2, 'ellipsis', 5]);
    expect(paginationWindow(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });

  it('handles the current page at both edges', () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
    expect(paginationWindow(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
  });

  it('matches the spec example shape for a large total', () => {
    expect(paginationWindow(5, 29)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 29]);
  });

  it('clamps out-of-range and invalid input', () => {
    expect(paginationWindow(0, 5)).toEqual(paginationWindow(1, 5));
    expect(paginationWindow(99, 5)).toEqual(paginationWindow(5, 5));
    expect(paginationWindow(3, 0)).toEqual([1]);
    expect(paginationWindow(Number.NaN, Number.NaN)).toEqual([1]);
  });
});

describe('buildPagedPath', () => {
  it('returns the base path for page 1', () => {
    expect(buildPagedPath('/blog/category/va-loan-help', 1)).toBe('/blog/category/va-loan-help');
  });

  it('appends /page/N for deeper pages', () => {
    expect(buildPagedPath('/blog/category/va-loan-help', 3)).toBe(
      '/blog/category/va-loan-help/page/3',
    );
  });
});
