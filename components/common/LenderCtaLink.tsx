import type { ReactNode } from 'react';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';

type Props = {
  stateSlug?: string | null;
  stateCode?: string | null;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  ctaId?: string;
  ctaPosition?: string;
  ctaComponent?: string;
};

export default function LenderCtaLink({
  stateSlug,
  stateCode,
  className = '',
  children = 'Find a Lender',
  onClick,
  ctaId = 'find_lender',
  ctaPosition = 'shared_lender_cta',
  ctaComponent = 'lender_cta_link',
}: Props) {
  const href = buildContactCtaHref({ stateSlug, form: 'lender' });

  return (
    <TrackedCtaLink
      href={href}
      className={className}
      onClick={onClick}
      cta={{
        ctaId,
        ctaIntent: 'contact_lender',
        ctaPosition,
        ctaComponent,
        ctaLabel: typeof children === 'string' ? children : undefined,
        destination: href,
        stateCode,
        stateSlug,
        partnerType: 'lender',
      }}
    >
      {children}
    </TrackedCtaLink>
  );
}
