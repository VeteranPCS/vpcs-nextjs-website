'use client';

import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import { getStateDisplayName } from '@/lib/blog/getStateForBlog';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';

// The 'bottom' placement was retired (zero organic clicks); this component
// now renders only in the single top position on agent-intent posts.
type Props = {
  state: string;
  blogSlug: string;
};

export default function FindAgentInState({ state, blogSlug }: Props) {
  const displayName = getStateDisplayName(state);
  const href = `/${state}?source=blog&blog_slug=${encodeURIComponent(blogSlug)}`;

  const handleClick = () => {
    sendGTMEvent({
      event: 'blog_to_state_cta_click',
      state,
      blog_slug: blogSlug,
      position: 'top',
    });
    trackCtaClicked(buildCtaProperties({
      ctaId: 'blog_find_agent_in_state',
      ctaIntent: 'state_agent_search',
      ctaPosition: 'top',
      ctaComponent: 'blog_find_agent_in_state',
      destination: href,
      pageType: 'blog_post',
      stateSlug: state,
      contentSlug: blogSlug,
      contentType: 'blog_post',
    }));
  };

  return (
    <div className="container mx-auto w-full my-12 px-4" data-cta-id="blog_find_agent_in_state">
      <div
        className="rounded-[32px] p-8 sm:p-12 text-white text-center"
        style={{
          background: 'linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%)',
        }}
      >
        <h2 className="text-[28px] sm:text-[36px] font-bold mb-4">
          Find a veteran-friendly agent in {displayName}
        </h2>
        <p className="text-base sm:text-lg mb-6 max-w-2xl mx-auto">
          Our {displayName} agents are PCS-fluent and VA-loan experts. Get matched in minutes. No spam, no pressure.
        </p>
        <Link
          href={href}
          onClick={handleClick}
          className="inline-block rounded-full bg-white text-[#2A2F6C] font-bold px-8 py-3 border-2 border-[#A3161B] hover:bg-[#F8F8F8] transition"
        >
          Find a {displayName} Agent
        </Link>
      </div>
    </div>
  );
}
