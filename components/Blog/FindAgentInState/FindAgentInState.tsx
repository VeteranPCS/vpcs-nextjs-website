'use client';

import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import { getStateDisplayName } from '@/lib/blog/getStateForBlog';

type Position = 'top' | 'bottom';

type Props = {
  state: string;
  blogSlug: string;
  position: Position;
};

export default function FindAgentInState({ state, blogSlug, position }: Props) {
  const displayName = getStateDisplayName(state);
  const href = `/${state}?source=blog&blog_slug=${encodeURIComponent(blogSlug)}`;

  const handleClick = () => {
    sendGTMEvent({
      event: 'blog_to_state_cta_click',
      state,
      blog_slug: blogSlug,
      position,
    });
  };

  return (
    <div className="container mx-auto w-full my-12 px-4">
      <div
        className="rounded-[32px] p-8 sm:p-12 text-white text-center"
        style={{
          background: 'linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%)',
        }}
      >
        <h2 className="text-[28px] sm:text-[36px] font-bold tahoma mb-4">
          Find a veteran-friendly agent in {displayName}
        </h2>
        <p className="text-base sm:text-lg mb-6 max-w-2xl mx-auto">
          Our {displayName} agents are PCS-fluent and VA-loan experts. Get matched in minutes — no spam, no pressure.
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
