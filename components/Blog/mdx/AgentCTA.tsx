import AuthorByline from '@/components/Blog/AuthorByline';

type Props = {
  salesforceId: string;
  name?: string;
};

export default function AgentCTA({ salesforceId, name }: Props) {
  return (
    <div className="my-8 flex justify-center">
      <AuthorByline
        frontmatterAuthor={{ salesforceId, name }}
        variant="card"
      />
    </div>
  );
}
