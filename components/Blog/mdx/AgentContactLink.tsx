import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  getAuthorContactHref,
  resolveAuthor,
  resolvedAuthorMatchesSalesforceId,
} from '@/lib/blog/authors';
import type { ResolvedAuthor } from '@/lib/blog/types';

type Props = {
  salesforceId: string;
  name?: string;
  state?: string;
  stateSlug?: string;
  children: ReactNode;
  resolvedAuthor?: ResolvedAuthor | null;
};

export default async function AgentContactLink({
  salesforceId,
  name,
  state,
  stateSlug,
  children,
  resolvedAuthor,
}: Props) {
  const authorInput = { salesforceId, name, state, stateSlug };
  const author = resolvedAuthorMatchesSalesforceId(resolvedAuthor, salesforceId)
    ? resolvedAuthor
    : await resolveAuthor(authorInput);

  const href = getAuthorContactHref(author, authorInput);

  return (
    <Link href={href} className="text-[#A81F23] underline hover:text-[#871B1C]">
      {children}
    </Link>
  );
}
