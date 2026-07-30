import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";

const JAMIE_FISCHER = {
  firstName: "Jamie",
  fullName: "Jamie Fischer",
  salesforceId: "0014x0000100OSg",
  headshotPath: "/images/lenders/0014x0000100OSg.webp",
  phoneDisplay: "+1 (719) 304-6143",
  phoneHref: "tel:+17193046143",
  brokerage: "iHome Mortgage",
  individualNmls: "1236499",
  companyNmls: "1564664",
} as const;

const contactHref = buildContactCtaHref({
  firstName: JAMIE_FISCHER.firstName,
  salesforceId: JAMIE_FISCHER.salesforceId,
  form: "lender",
});

export default function RefinancingLenderCard() {
  return (
    <aside
      aria-labelledby="refinancing-lender-name"
      className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(8,15,52,0.28)] ring-1 ring-white/50"
    >
      <div className="h-2 bg-accent-red" aria-hidden="true" />
      <div className="p-5 sm:p-7">
        <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-accent-red sm:text-left">
          Featured refinancing lender
        </p>

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-[#E1EDFB] ring-4 ring-[#E1EDFB] sm:h-40 sm:w-40">
            <Image
              src={JAMIE_FISCHER.headshotPath}
              alt={`${JAMIE_FISCHER.fullName}, VeteranPCS lender`}
              width={730}
              height={730}
              sizes="(min-width: 640px) 160px, 144px"
              className="h-full w-full object-cover"
              preload
            />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <h2
              id="refinancing-lender-name"
              className="text-3xl font-bold leading-tight text-primary"
            >
              {JAMIE_FISCHER.fullName}
            </h2>
            <p className="mt-2 text-base font-semibold text-[#495057]">
              Army Veteran · {JAMIE_FISCHER.brokerage}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#6C757D]">
              NMLS #{JAMIE_FISCHER.individualNmls}
              <br />
              Company NMLS #{JAMIE_FISCHER.companyNmls}
            </p>
            <TrackedCtaLink
              href={JAMIE_FISCHER.phoneHref}
              className="mt-3 inline-flex min-h-11 items-center text-base font-bold text-accent-red underline decoration-2 underline-offset-4 transition-colors hover:text-accent-red-dark"
              aria-label={`Call ${JAMIE_FISCHER.fullName} at ${JAMIE_FISCHER.phoneDisplay}`}
              cta={{
                ctaId: "refinancing_lender_phone",
                ctaIntent: "contact_phone",
                ctaPosition: "refinancing_hero",
                ctaComponent: "refinancing_lender_card",
                ctaLabel: JAMIE_FISCHER.phoneDisplay,
                destination: JAMIE_FISCHER.phoneHref,
                pageType: "refinancing",
                partnerType: "lender",
                partnerSalesforceId: JAMIE_FISCHER.salesforceId,
              }}
            >
              {JAMIE_FISCHER.phoneDisplay}
            </TrackedCtaLink>
          </div>
        </div>

        <TrackedCtaLink
          href={contactHref}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent-red px-5 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-accent-red-dark active:bg-accent-red-dark"
          cta={{
            ctaId: "refinancing_lender_contact",
            ctaIntent: "contact_lender",
            ctaPosition: "refinancing_hero",
            ctaComponent: "refinancing_lender_card",
            ctaLabel: `Connect with ${JAMIE_FISCHER.firstName}`,
            destination: contactHref,
            pageType: "refinancing",
            partnerType: "lender",
            partnerSalesforceId: JAMIE_FISCHER.salesforceId,
          }}
        >
          Connect with {JAMIE_FISCHER.firstName}
        </TrackedCtaLink>
      </div>
    </aside>
  );
}
