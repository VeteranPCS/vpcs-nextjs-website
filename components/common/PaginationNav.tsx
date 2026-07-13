import Link from 'next/link';
import { paginationWindow } from '@/lib/blog/pagination';

type Props = {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

const linkClasses =
  'inline-flex items-center min-h-11 rounded-custom border border-[#E2E4E5] px-4 py-3 text-[#292F6C]';

/**
 * Crawlable numbered pagination. Server component: plain anchors via next/link,
 * no click tracking (pagination is navigation chrome; pageviews capture it).
 */
export default function PaginationNav({ currentPage, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;

  const items = paginationWindow(currentPage, totalPages);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-label="Pagination">
      {currentPage > 1 && (
        <Link href={hrefFor(currentPage - 1)} className={linkClasses}>
          Previous
        </Link>
      )}
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex items-center min-h-11 px-2 text-[#6C757D]"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : item === currentPage ? (
          <span
            key={item}
            aria-current="page"
            className="inline-flex items-center min-h-11 rounded-custom bg-[#292F6C] px-4 py-3 font-bold text-white"
          >
            {item}
          </span>
        ) : (
          <Link key={item} href={hrefFor(item)} className={linkClasses}>
            {item}
          </Link>
        ),
      )}
      {currentPage < totalPages && (
        <Link href={hrefFor(currentPage + 1)} className={linkClasses}>
          Next
        </Link>
      )}
    </nav>
  );
}
