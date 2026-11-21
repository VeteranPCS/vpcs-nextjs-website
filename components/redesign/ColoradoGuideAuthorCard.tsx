import Image from 'next/image';
import { COLORADO_RELOCATION_GUIDE as guide } from '@/lib/guides/colorado-relocation';
import type { ContactPrefillDetails } from '@/lib/leads/contact-prefill';
import ColoradoGuideContactLink from './ColoradoGuideContactLink';

/** The next step after downloading: meet the real local agent who wrote the guide. */
export default function ColoradoGuideAuthorCard({ contactDetails }: { contactDetails?: ContactPrefillDetails }) {
  return <section data-guide-contact-card aria-label="Meet Tyler Parker" className="border-t border-primary/15 pt-5">
    <div className="flex items-center gap-4">
      <Image
        src="/images/agents/001Rg00000pmUUk.webp"
        alt="Tyler Parker"
        width={96}
        height={96}
        sizes="96px"
        className="size-24 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-primary">{guide.author}</h3>
        <p className="mt-1 text-sm font-semibold text-primary">Air Force Veteran</p>
        <p className="mt-1 text-sm text-primary">{guide.brokerage}</p>
      </div>
    </div>
    <p className="mt-4 text-sm leading-6 text-primary">
      Have questions about your move? Tyler can help you compare communities and plan your next steps.
    </p>
    <ColoradoGuideContactLink
      location="guide_download_success"
      contactDetails={contactDetails}
      className="steph-button mt-5 w-full"
    />
  </section>;
}
