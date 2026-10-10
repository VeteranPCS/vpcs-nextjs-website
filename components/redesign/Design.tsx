import type { ReactNode } from 'react';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
export function SectionHeading({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return <div className="steph-heading"><div className="steph-star" aria-hidden="true">★</div>{eyebrow && <p className="steph-eyebrow">{eyebrow}</p>}<h2>{children}</h2></div>;
}
export function DesignLink({ href, children, id, intent = 'content_navigation', className = '' }: { href: string; children: ReactNode; id: string; intent?: string; className?: string }) {
  return <TrackedCtaLink href={href} className={`steph-button ${className}`} cta={{ ctaId:id, ctaIntent:intent, ctaComponent:'steph_redesign', ctaPosition:id, destination:href }}>{children}</TrackedCtaLink>;
}
