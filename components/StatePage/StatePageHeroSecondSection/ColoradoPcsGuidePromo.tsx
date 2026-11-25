import Image from 'next/image';
import LeadCaptureDialog from '@/components/redesign/LeadCaptureDialog';
import ColoradoGuideContactLink from '@/components/redesign/ColoradoGuideContactLink';
import { COLORADO_RELOCATION_GUIDE as guide } from '@/lib/guides/colorado-relocation';
import { isProductionSalesforceRuntime } from '@/lib/salesforce/environment.mjs';

export default function ColoradoPcsGuidePromo() {
  const allowAuthorContact = isProductionSalesforceRuntime();
  return (
    <section aria-labelledby="colorado-relocation-guide-title" className="bg-surface py-12 font-inter md:py-16">
      <div className="mx-auto grid max-w-[1120px] items-center gap-8 px-6 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-12">
        <div className="flex justify-center md:justify-end">
          <Image
            src={guide.coverPath}
            alt="Cover of the Colorado Relocation Guide by Tyler Parker"
            width={408}
            height={528}
            sizes="(min-width: 768px) 224px, 160px"
            className="h-auto w-40 shadow-header md:w-56"
          />
        </div>
        <div className="max-w-[600px]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent-red">
            Free PDF · 22 pages
          </p>
          <h2 id="colorado-relocation-guide-title" className="mt-3 font-poppins text-3xl font-bold leading-tight text-primary md:text-4xl">
            {guide.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-primary md:text-lg">
            Get to know Colorado before you move. Explore communities, schools, and commutes—with a closer look at South Metro Denver.
          </p>
          <p className="mt-4 text-sm leading-6 text-primary">
            By <span className="font-semibold">{guide.author}</span> · {guide.brokerage}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LeadCaptureDialog
              kind={guide.kind}
              triggerLabel="Download Now"
              placement={{ location: 'state_guide_section', position: 'inline', pageType: 'state_page' }}
              allowAuthorContact={allowAuthorContact}
            />
            <ColoradoGuideContactLink allowAuthorContact={allowAuthorContact} location="state_guide_section" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
