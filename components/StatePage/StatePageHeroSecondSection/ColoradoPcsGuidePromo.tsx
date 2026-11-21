"use client";

import Image from 'next/image';
import LeadCaptureDialog from '@/components/redesign/LeadCaptureDialog';
import ColoradoGuideContactLink from '@/components/redesign/ColoradoGuideContactLink';
import { COLORADO_RELOCATION_GUIDE as guide } from '@/lib/guides/colorado-relocation';

export default function ColoradoPcsGuidePromo() {
  return (
    <section aria-labelledby="colorado-relocation-guide-title" className="flex w-full max-w-[430px] flex-col items-start text-left">
      <p className="font-inter text-xs font-bold uppercase tracking-[0.12em] text-white/80">
        Free PDF · 22 pages
      </p>
      <div className="mt-4 flex w-full items-start gap-4">
        <Image
          src={guide.coverPath}
          alt="Cover of the Colorado Relocation Guide by Tyler Parker"
          width={408}
          height={528}
          sizes="(min-width: 1280px) 96px, 80px"
          className="h-auto w-20 shrink-0 xl:w-24"
        />
        <div className="min-w-0">
          <h2 id="colorado-relocation-guide-title" className="font-poppins text-xl font-bold leading-tight text-white xl:text-2xl">
            {guide.title}
          </h2>
          <p className="mt-3 font-inter text-sm leading-5 text-white/90">
            By {guide.author}<br />{guide.brokerage}
          </p>
        </div>
      </div>
      <p className="mt-4 font-inter text-sm leading-6 text-white/90">
        Explore Colorado communities, schools, and commutes—with a closer look at South Metro Denver.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LeadCaptureDialog
          kind={guide.kind}
          triggerLabel="Download Now"
          placement={{ location: 'state_hero_secondary', position: 'inline', pageType: 'state_page' }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 font-inter text-sm font-bold text-primary transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        />
        <ColoradoGuideContactLink location="state_hero_secondary" className="inline-flex min-h-11 items-center font-inter text-sm font-semibold text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
      </div>
    </section>
  );
}
