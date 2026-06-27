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

export default function AgentCtaLink({
  stateSlug,
  stateCode,
  className = '',
  children = 'Find an Agent',
  onClick,
  ctaId = 'find_agent',
  ctaPosition = 'shared_agent_cta',
  ctaComponent = 'agent_cta_link',
}: Props) {
  const href = buildContactCtaHref({ stateSlug, form: 'agent' });

  return (
    <TrackedCtaLink
      href={href}
      className={className}
      onClick={onClick}
      cta={{
        ctaId,
        ctaIntent: 'contact_agent',
        ctaPosition,
        ctaComponent,
        ctaLabel: typeof children === 'string' ? children : undefined,
        destination: href,
        stateCode,
        stateSlug,
        partnerType: 'agent',
      }}
    >
      {children}
    </TrackedCtaLink>
  );
}
