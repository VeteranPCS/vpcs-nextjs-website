import AuthorByline from '@/components/Blog/AuthorByline';
import { resolvedAuthorMatchesSalesforceId } from '@/lib/blog/authors';
import type { ResolvedAuthor } from '@/lib/blog/types';

type Props = {
  salesforceId: string;
  name?: string;
  state?: string;
  stateSlug?: string;
  resolvedAuthor?: ResolvedAuthor | null;
};

export default function AgentCTA({
  salesforceId,
  name,
  state,
  stateSlug,
  resolvedAuthor,
}: Props) {
  const frontmatterAuthor = { salesforceId, name, state, stateSlug };
  const matchingResolvedAuthor = resolvedAuthorMatchesSalesforceId(
    resolvedAuthor,
    salesforceId,
  )
    ? resolvedAuthor
    : null;

  return (
    <div className="my-8 flex justify-center">
      <AuthorByline
        frontmatterAuthor={frontmatterAuthor}
        resolvedAuthor={matchingResolvedAuthor}
        variant="card"
      />
    </div>
  );
}
