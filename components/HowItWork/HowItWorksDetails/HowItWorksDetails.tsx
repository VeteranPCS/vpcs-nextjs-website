import Link from "next/link";
import AccordionItem from "@/components/common/AccordionItem";
import Button from "@/components/common/Button";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { MOVE_IN_BONUS } from "@/lib/content/how-it-works";
import {
  HOW_IT_WORKS_CONTENT,
  MOVE_IN_BONUS_CONTENT,
} from "./howItWorksContent";

const SERVICE = HOW_IT_WORKS_CONTENT["4f9600b4-0e71-492e-a8ce-2b7036b7d844"];
const ELIGIBILITY = HOW_IT_WORKS_CONTENT["05606310-8d1a-4c67-ae2f-a9aaad24dc2f"];
const DIFFERENT = HOW_IT_WORKS_CONTENT["117273c4-d4b5-44ef-954e-81b73dc6dbfe"];
const AGENTS = HOW_IT_WORKS_CONTENT["4762721d-0adf-43f8-b574-60f1d9ea5cb2"];
const LENDERS = HOW_IT_WORKS_CONTENT["214430af-b230-46fa-99e2-0b4f50077952"];
const CHARITIES = HOW_IT_WORKS_CONTENT["ef0bd7c2-bfce-4444-b577-ea8782774d44"];

const headingClasses =
  "poppins text-primary lg:text-[33px] md:text-[30px] text-[25px] font-bold mb-8";

// The contract bodies (howItWorksContent.tsx) are fixed JSX; block-level
// styling is applied from these wrappers via arbitrary-variant selectors so
// the parity-gated content module stays presentation-free.
const bodyClasses = [
  "text-gray-700",
  "[&_h3]:font-poppins [&_h3]:text-primary [&_h3]:text-[22px] [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-2",
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:space-y-2",
  "[&_li]:leading-relaxed",
].join(" ");

// Section A only: restyle the body's FIRST <ul> (the key-facts strip) as
// check-icon rows. Higher-specificity selectors override the generic list
// styling above; the check icon is decorative chrome drawn with ::before.
const keyFactsClasses = [
  "[&>ul:first-of-type]:list-none [&>ul:first-of-type]:pl-0 [&>ul:first-of-type]:mb-10 [&>ul:first-of-type]:space-y-4",
  "[&>ul:first-of-type>li]:relative [&>ul:first-of-type>li]:pl-11",
  "[&>ul:first-of-type>li]:font-poppins [&>ul:first-of-type>li]:font-medium [&>ul:first-of-type>li]:text-primary [&>ul:first-of-type>li]:text-[17px] [&>ul:first-of-type>li]:leading-7",
  "[&>ul:first-of-type>li]:before:content-[''] [&>ul:first-of-type>li]:before:absolute [&>ul:first-of-type>li]:before:left-0 [&>ul:first-of-type>li]:before:top-0.5 [&>ul:first-of-type>li]:before:h-7 [&>ul:first-of-type>li]:before:w-7 [&>ul:first-of-type>li]:before:bg-[url('/icon/checkred.svg')] [&>ul:first-of-type>li]:before:bg-contain [&>ul:first-of-type>li]:before:bg-no-repeat",
].join(" ");

const tableHeaderCell =
  "p-3 poppins text-primary md:text-[18px] text-[16px] font-semibold";
const tableCell = "p-3 roboto text-gray-700 md:text-[18px] text-[16px]";

function SectionBand({
  id,
  shaded = false,
  children,
}: {
  id: string;
  shaded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={shaded ? "bg-surface" : "bg-white"}>
      <div className="container mx-auto px-5 lg:px-0 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
    </section>
  );
}

export default function HowItWorksDetails() {
  return (
    <>
      {/* A - How the VeteranPCS Service Works */}
      <SectionBand id={SERVICE.slug}>
        <h2 className={headingClasses}>{SERVICE.title}</h2>
        <div className={`${bodyClasses} ${keyFactsClasses}`}>{SERVICE.body}</div>
        <TrackedCtaLink
          href="#agent-map"
          cta={{
            ctaId: "how_it_works_find_agent",
            ctaIntent: "find_agent",
            ctaPosition: "details_section",
            ctaComponent: "HowItWorksDetails",
            ctaLabel: "Find your agent",
            pageType: "how_it_works",
            // A bare fragment href would resolve to "/" in safePath; record the real page.
            destination: "/how-it-works#agent-map",
          }}
        >
          <Button buttonText="Find your agent" />
        </TrackedCtaLink>
      </SectionBand>

      {/* B - How the VeteranPCS Bonus Works */}
      <SectionBand id="how-the-veteranpcs-bonus-works" shaded>
        <h2 className={headingClasses}>{MOVE_IN_BONUS.title}</h2>
        <div className={bodyClasses}>{MOVE_IN_BONUS_CONTENT.description}</div>
        <div className="overflow-x-auto mb-8">
          <table className="w-full border border-gray-300 bg-white text-left">
            <caption className="sr-only">
              VeteranPCS Bonus and charity donation amounts by home price
            </caption>
            <thead>
              <tr className="border-b border-gray-300">
                <th scope="col" className={tableHeaderCell}>
                  Home Price
                </th>
                <th scope="col" className={tableHeaderCell}>
                  Move-In Bonus
                </th>
                <th scope="col" className={tableHeaderCell}>
                  Charity Donation
                </th>
              </tr>
            </thead>
            <tbody>
              {MOVE_IN_BONUS.bonusTable.map((row) => (
                <tr key={row._key} className="border-t border-gray-300">
                  <td className={`${tableCell} font-semibold`}>{row.priceRange}</td>
                  <td className={tableCell}>{row.moveInBonus}</td>
                  <td className={tableCell}>{row.charityDonation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={bodyClasses}>{MOVE_IN_BONUS_CONTENT.requirements}</div>
      </SectionBand>

      {/* C - Who Is Eligible for the Bonus? */}
      <SectionBand id={ELIGIBILITY.slug}>
        <h2 className={headingClasses}>{ELIGIBILITY.title}</h2>
        <div className={bodyClasses}>{ELIGIBILITY.body}</div>
      </SectionBand>

      {/* D - What Makes Us Different */}
      <SectionBand id={DIFFERENT.slug} shaded>
        <h2 className={headingClasses}>{DIFFERENT.title}</h2>
        <div className={bodyClasses}>{DIFFERENT.body}</div>
      </SectionBand>

      {/* E - For Agents and Lenders */}
      <SectionBand id="for-agents-and-lenders">
        <h2 className={headingClasses}>For Agents and Lenders</h2>
        <p className="text-gray-700 leading-relaxed mb-8">
          Working with us as an agent or loan officer? Start here, or visit our
          contact page to{" "}
          <Link
            href="/contact"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            become a preferred agent or lender
          </Link>{" "}
          with VeteranPCS.
        </p>
        <AccordionItem
          id={AGENTS.slug}
          title={AGENTS.title}
          content={<div className={bodyClasses}>{AGENTS.body}</div>}
        />
        <AccordionItem
          id={LENDERS.slug}
          title={LENDERS.title}
          content={<div className={bodyClasses}>{LENDERS.body}</div>}
        />
        <AccordionItem
          id={CHARITIES.slug}
          title={CHARITIES.title}
          content={<div className={bodyClasses}>{CHARITIES.body}</div>}
        />
        <p className="text-gray-600 text-[15px] leading-relaxed mt-10">
          This page is a general overview of the VeteranPCS service; the full
          details that govern it are in our{" "}
          <Link
            href="/terms-of-use"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Terms of Use
          </Link>
          .
        </p>
      </SectionBand>
    </>
  );
}
