import Link from 'next/link';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';

type Props = {
  stateSlug?: string | null;
  className?: string;
  children?: string;
  onClick?: () => void;
};

export default function AgentCtaLink({
  stateSlug,
  className = '',
  children = 'Find an Agent',
  onClick,
}: Props) {
  return (
    <Link href={buildContactCtaHref({ stateSlug, form: 'agent' })} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
