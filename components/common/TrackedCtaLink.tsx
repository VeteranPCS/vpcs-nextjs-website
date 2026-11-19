'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties, type CtaTrackingInput } from '@/lib/analytics/cta';
import { SAME_PAGE_CONTACT_CTA_EVENT, isGenericSameContactAgentLink, type SamePageContactCtaDetail } from '@/lib/contactAgentUrl';

type Props = LinkProps
  & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'href' | 'onClick'>
  & {
    children: ReactNode;
    cta: CtaTrackingInput;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  };

function hrefToPathCandidate(href: LinkProps['href']): unknown {
  if (typeof href === 'string' || href instanceof URL) return href;
  return href.pathname;
}

export default function TrackedCtaLink({
  href,
  cta,
  onClick,
  children,
  ...props
}: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackCtaClicked(buildCtaProperties({
      ...cta,
      destination: cta.destination ?? hrefToPathCandidate(href),
    }));
    onClick?.(event);

    // A generic link back to the agent contact page, clicked on that page, must not navigate:
    // the lead is submitted with the current query string, and navigating would replace it
    // and drop the selected agent. Returning to the top keeps what the visitor saw before.
    // A link that names its own agent or state is a new choice and navigates normally.
    const opensElsewhere = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || (props.target !== undefined && props.target !== '_self');
    if (event.defaultPrevented || opensElsewhere) return;
    if (!isGenericSameContactAgentLink(hrefToPathCandidate(href), window.location.pathname)) return;
    event.preventDefault();
    const notHandled = window.dispatchEvent(new CustomEvent<SamePageContactCtaDetail>(SAME_PAGE_CONTACT_CTA_EVENT, {
      cancelable: true,
      detail: { ctaId: cta.ctaId },
    }));
    if (notHandled) window.scrollTo(0, 0);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
