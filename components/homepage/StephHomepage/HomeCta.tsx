import type { ReactNode } from 'react';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import styles from './StephHomepage.module.css';

export default function HomeCta({ href, children, id, intent = 'contact_agent', className = '' }: {
  href: string; children: ReactNode; id: string; intent?: string; className?: string;
}) {
  return <TrackedCtaLink href={href} className={`${styles.button} ${className}`} cta={{
    ctaId: id, ctaIntent: intent, ctaPosition: id, ctaComponent: 'steph_homepage',
    ctaLabel: typeof children === 'string' ? children : id, destination: href, pageType: 'homepage',
  }}>{children}</TrackedCtaLink>;
}
