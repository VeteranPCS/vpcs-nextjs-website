import Link from 'next/link';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';

type Props = {
  stateSlug?: string | null;
  className?: string;
  children?: string;
  onClick?: () => void;
};

export default function LenderCtaLink({
  stateSlug,
  className = '',
  children = 'Find a Lender',
  onClick,
}: Props) {
  return (
    <Link href={buildContactCtaHref({ stateSlug, form: 'lender' })} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
