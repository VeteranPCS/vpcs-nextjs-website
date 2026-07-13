export type PaginationItem = number | 'ellipsis';

/**
 * Numbered-pagination window: always includes the first and last page plus the
 * current page and its immediate siblings. A gap collapses to a single
 * 'ellipsis' marker only when 2+ pages are hidden; a single hidden page is
 * shown directly (an ellipsis standing in for one page saves nothing).
 */
export function paginationWindow(currentPage: number, totalPages: number): PaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages) || 1);
  const current = Math.min(Math.max(1, Math.floor(currentPage) || 1), total);

  const wanted = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  let prev: number | null = null;
  for (const page of pages) {
    if (prev !== null) {
      if (page - prev === 2) {
        // Only one page hidden: render it instead of an ellipsis.
        items.push(prev + 1);
      } else if (page - prev > 2) {
        items.push('ellipsis');
      }
    }
    items.push(page);
    prev = page;
  }
  return items;
}

/**
 * Page 1 lives at the base path itself; deeper pages append /page/N.
 * Mirrors the category hub URL convention (/blog/category/[category]/page/[page]).
 */
export function buildPagedPath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}
