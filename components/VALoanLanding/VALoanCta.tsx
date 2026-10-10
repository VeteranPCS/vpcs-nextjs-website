import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import type { ReactNode } from 'react';
export default function VALoanCta({ href, children, id, className = 'steph-button', intent = 'contact_lender', position = 'va_landing' }: { href:string; children:ReactNode; id:string; className?:string; intent?:string; position?:string }) {
  return <TrackedCtaLink href={href} className={className} cta={{ ctaId:id, ctaIntent:intent, ctaPosition:position, ctaComponent:'va_loan_landing', ctaLabel:typeof children === 'string' ? children : id, destination:href, pageType:'va_loan_help' }}>{children}</TrackedCtaLink>;
}
