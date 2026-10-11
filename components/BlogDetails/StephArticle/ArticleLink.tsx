'use client';
import { sendGTMEvent } from '@next/third-parties/google';
import type { ReactNode } from 'react';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import type { CtaTrackingInput } from '@/lib/analytics/cta';
export type ArticleContext = { contentSlug:string; stateSlug:string|null; partnerType:'agent'|'lender' };
export default function ArticleLink({ href, children, id, context, intent = 'content_navigation', className = '', partnerSalesforceId }: { href:string; children:ReactNode; id:string; context:ArticleContext; intent?:string; className?:string; partnerSalesforceId?:string }) {
  const previous:Record<string,{position:string;component:string}>={blog_details_find_agent:{position:'blog_details_cta_band',component:'blog_details_cta'},blog_details_find_lender:{position:'blog_details_cta_band',component:'blog_details_cta'},blog_author_contact:{position:'author_card',component:'blog_author_byline'},blog_breadcrumb_category:{position:'blog_post_breadcrumb',component:'blog_breadcrumb'},blog_find_agent_in_state:{position:'top',component:'blog_find_agent_in_state'},blog_mobile_sticky_agent:{position:'mobile_sticky_footer',component:'blog_mobile_sticky_cta'},blog_mobile_sticky_lender:{position:'mobile_sticky_footer',component:'blog_mobile_sticky_cta'},blog_related_card:{position:'blog_post_related_rail',component:'blog_card'}};
  const existing=previous[id];
  const cta:CtaTrackingInput = { ctaId:id, ctaIntent:intent, ctaPosition:existing?.position??id, ctaComponent:existing?.component??'steph_article', ctaLabel:typeof children==='string'?children:undefined, destination:href, pageType:'blog_post', contentType:'blog_post', ...context, partnerSalesforceId };
  return <TrackedCtaLink href={href} className={className} cta={cta} onClick={id==='blog_find_agent_in_state'?()=>sendGTMEvent({event:'blog_to_state_cta_click',state:context.stateSlug,blog_slug:context.contentSlug,position:'top'}):undefined}>{children}</TrackedCtaLink>;
}
