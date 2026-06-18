import AuthorByline from '@/components/Blog/AuthorByline';

type Props = {
  salesforceId: string;
  name?: string;
  state?: string;
  stateSlug?: string;
};

export default function AgentCTA({ salesforceId, name, state, stateSlug }: Props) {
  return (
    <div className="my-8 flex justify-center">
      <AuthorByline
        frontmatterAuthor={{ salesforceId, name, state, stateSlug }}
        variant="card"
      />
    </div>
  );
}
