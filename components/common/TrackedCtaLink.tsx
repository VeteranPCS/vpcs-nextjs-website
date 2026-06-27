'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties, type CtaTrackingInput } from '@/lib/analytics/cta';

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
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
