import type { ReactNode } from 'react';
import Link from 'next/link';

// Classes match the paragraph/link rendering of the FAQ content module
// (components/stories/FrequentlyAskedQuestions/faqContent.tsx); block-level
// layout and section styling belong to HowItWorksDetails, not here.
const bodyParagraph = 'mb-6 text-gray-700 leading-relaxed';
const bodyLink = 'text-blue-600 hover:text-blue-800 underline';

/**
 * How It Works section bodies hand-transcribed from the Portable Text export
 * (content/_data/site/how_veterence_pcs_works.json, moveInBonus.json), keyed
 * by document `_id`. Section titles still come from each document's
 * `component_header` via lib/content/how-it-works.ts; only the rendered body
 * lives here so headings, lists, links, and emphasis stay freely editable JSX.
 * The hero document (845ffc52-f46f-4aad-8c7e-b1b3571c698f) is deliberately
 * excluded: HowItWorkHeroSection renders it from the loader.
 *
 * Editing a body? lib/content/__tests__/how-it-works-parity.test.tsx compares
 * this module's rendered output against the exported JSON; update or retire
 * that check deliberately if the copy is meant to diverge from the export.
 */

/** The six non-hero `how_veterence_pcs_works` body documents plus their slugs. */
export type HowItWorksSectionId =
  | '4f9600b4-0e71-492e-a8ce-2b7036b7d844' // how-the-veteranpcs-service-works
  | '05606310-8d1a-4c67-ae2f-a9aaad24dc2f' // who-is-eligible-for-the-move-in-bonus
  | '117273c4-d4b5-44ef-954e-81b73dc6dbfe' // what-makes-us-different
  | '4762721d-0adf-43f8-b574-60f1d9ea5cb2' // how-it-works-for-agents
  | '214430af-b230-46fa-99e2-0b4f50077952' // how-it-works-for-mortgage-loan-officers
  | 'ef0bd7c2-bfce-4444-b577-ea8782774d44'; // what-charities-do-you-support

export type HowItWorksSectionContent = {
  id: HowItWorksSectionId;
  /** header_slug.current of the matching document (loader lookup key). */
  slug: string;
  /** Joined component_header text of the matching document. */
  title: string;
  /** Full JSX transcription of the document's `description` Portable Text. */
  body: ReactNode;
};

export const HOW_IT_WORKS_CONTENT: Readonly<
  Record<HowItWorksSectionId, HowItWorksSectionContent>
> = {
  // Section A - How the VeteranPCS Service Works (member-first, expanded)
  '4f9600b4-0e71-492e-a8ce-2b7036b7d844': {
    id: '4f9600b4-0e71-492e-a8ce-2b7036b7d844',
    slug: 'how-the-veteranpcs-service-works',
    title: 'How the VeteranPCS Service Works',
    body: (
      <>
        {/* first <ul> is the key-facts strip */}
        <ul>
          <li>
            The VeteranPCS service is <strong>free to use</strong>.
          </li>
          <li>
            Your agent pays VeteranPCS a <strong>30% referral fee</strong> at closing.
          </li>
          <li>
            You receive a <strong>Move-In or Military Bonus</strong> of $200 to $4,000 when
            your state allows it.
          </li>
          <li>
            10% of your bonus amount also goes to <strong>military charities</strong>.
          </li>
        </ul>
        <h3>What does it cost?</h3>
        <p className={bodyParagraph}>
          The VeteranPCS service is free to use. Your agent pays VeteranPCS a referral fee.
          The fee comes out of the commission they earn when you buy or sell a home through
          the site.
        </p>
        <p className={bodyParagraph}>
          VeteranPCS then shares part of that referral fee with you as your VeteranPCS Bonus
          at or after closing.
        </p>
        <h3>Connecting with an agent</h3>
        <p className={bodyParagraph}>
          You can{' '}
          <a href="#agent-map" className={bodyLink}>
            browse agents by state
          </a>{' '}
          and contact them through the website. Click the “Get in Contact” button and fill
          out a short form to connect with that agent.
        </p>
        <ul>
          <li>
            Your information is <strong>never shared or sold</strong>. The only purpose of
            the form is to connect you with that agent.
          </li>
          <li>
            When you submit the form, you receive an auto-email with that agent’s contact
            information. The agent receives an email with your information. You can start
            talking right away.
          </li>
          <li>
            If you sign an agency agreement with an agent, that contract happens outside the
            website. VeteranPCS is not a party to it.
          </li>
          <li>
            You <strong>must agree to receive periodic communications</strong> from us to
            use the service and receive the VeteranPCS Bonus. We track key dates to make
            sure you receive your bonus.
          </li>
        </ul>
        <h3>Interviewing agents</h3>
        <p className={bodyParagraph}>
          Fill out forms for as many agents as you like. Interview them yourself and pick
          the one who fits you best.
        </p>
        <ul>
          <li>
            Agents are not entitled to every lead from the website. You choose your agent.
            VeteranPCS tells each agent your decision so communication stays clear.
          </li>
          <li>
            Already signed a valid agency agreement with another agent? VeteranPCS is not a
            party to that contract and will not attempt to break it.
          </li>
        </ul>
        <h3>Follow up</h3>
        <p className={bodyParagraph}>
          We keep in contact with you and your agent through the whole process. We want to
          be sure you receive the quality of service we expect from every agent on
          VeteranPCS.
        </p>
        <ul>
          <li>
            If you are ever dissatisfied with the level of service, let us know. We will
            investigate and may suspend that agent’s use of our services.
          </li>
          <li>
            When you close on your home, your agent pays VeteranPCS a 30% referral fee from
            their total commission. VeteranPCS then sends your VeteranPCS Bonus to you if
            your state allows it (see How the VeteranPCS Bonus Works).
          </li>
        </ul>
      </>
    ),
  },
  // Section C - Who Is Eligible for the Bonus?
  '05606310-8d1a-4c67-ae2f-a9aaad24dc2f': {
    id: '05606310-8d1a-4c67-ae2f-a9aaad24dc2f',
    slug: 'who-is-eligible-for-the-move-in-bonus',
    title: 'Who Is Eligible for the Bonus?',
    body: (
      <>
        <p className={bodyParagraph}>
          The VeteranPCS Bonus is for current service members, veterans with an honorable
          discharge, and their spouses.
        </p>
        <p className={bodyParagraph}>You are eligible if you are:</p>
        <ul>
          <li>Currently serving in the U.S. Armed Forces</li>
          <li>A veteran who received an Honorable Discharge</li>
          <li>The spouse of someone who meets either one</li>
        </ul>
        <h3>Not a Service Member?</h3>
        <p className={bodyParagraph}>
          You can still use the VeteranPCS service. Instead of receiving the bonus, the
          amount that would have gone to you is donated to a veteran-focused charity.
        </p>
        <p className={bodyParagraph}>
          There are penalties for falsely claiming you are a Service Member. Full details
          are in the{' '}
          <Link href="/terms-of-use" className={bodyLink}>
            Terms of Use
          </Link>
          .
        </p>
      </>
    ),
  },
  // Section D - What Makes Us Different
  '117273c4-d4b5-44ef-954e-81b73dc6dbfe': {
    id: '117273c4-d4b5-44ef-954e-81b73dc6dbfe',
    slug: 'what-makes-us-different',
    title: 'What Makes Us Different',
    body: (
      <>
        <p className={bodyParagraph}>VeteranPCS was designed to add value in three ways:</p>
        <ul>
          <li>We connect military families with agents who have personally PCSd.</li>
          <li>We help agents who are veterans or military spouses earn more clients.</li>
          <li>We give back to veteran-focused charities.</li>
        </ul>
        <h3>Reviews</h3>
        <p className={bodyParagraph}>
          You will not see reviews listed for agents on this site.
        </p>
        <ul>
          <li>
            We interview and select every agent, and we verify their reviews. You do not
            need to sift through reviews to find a great agent.
          </li>
          <li>
            Every agent here was referred by a military client who bought or sold a house
            with them.
          </li>
          <li>
            Review-based sites can make it hard for a veteran or military spouse to start a
            business. They charge high fees, make it hard to get noticed, and do not show
            which agents have real PCS experience.
          </li>
          <li>
            If you want to see an agent’s reviews, you can get links to their personal
            websites once you contact them through the site.
          </li>
        </ul>
        <h3>Charities</h3>
        <p className={bodyParagraph}>
          VeteranPCS is proud to support many veteran-focused charities and organizations.
          We donate an additional 10% of your VeteranPCS Bonus amount to a military-focused
          charity. See the bonus table above for amounts.
        </p>
      </>
    ),
  },
  // Section E accordion - How It Works for Agents
  '4762721d-0adf-43f8-b574-60f1d9ea5cb2': {
    id: '4762721d-0adf-43f8-b574-60f1d9ea5cb2',
    slug: 'how-it-works-for-agents',
    title: 'How It Works for Agents',
    body: (
      <>
        <p className={bodyParagraph}>
          <em>
            This is a general overview of how our site works with agents. For full terms
            and conditions, refer to our Referral Partner Agreement.
          </em>
        </p>
        <h3>Who qualifies to be a Referral Partner?</h3>
        <p className={bodyParagraph}>
          To be a Referral Partner with VeteranPCS, you must be one of the following:
        </p>
        <ul>
          <li>Currently serving in the U.S. Armed Forces</li>
          <li>A veteran who received an Honorable Discharge</li>
          <li>The spouse of someone who met either one while they served</li>
        </ul>
        <p className={bodyParagraph}>
          Additional requirements are listed in the Referral Partner Agreement. Please{' '}
          <a href="https://www.veteranpcs.com/get-listed-agents" className={bodyLink}>
            fill out the agent form
          </a>{' '}
          if you are interested in becoming a Referral Partner.
        </p>
        <p className={bodyParagraph}>
          If you do not meet the exact criteria above but believe you should be considered,
          please{' '}
          <Link href="/contact" className={bodyLink}>
            contact us
          </Link>{' '}
          to discuss.
        </p>
        <h3>What does it cost?</h3>
        <ul>
          <li>
            VeteranPCS has no annual fees, no monthly fees, no fees for calls, and no hidden
            fees.
          </li>
          <li>
            We operate on a simple 30% referral fee of the gross commission for any customer
            who contacts you through VeteranPCS and closes on the sale or purchase of a
            home.
          </li>
          <li>
            VeteranPCS distributes part of that 30% referral fee back to the Service Member
            at or after closing, when your state allows it. If a client is not a Service
            Member, we donate that would-be bonus to a veteran and military focused charity
            instead.
          </li>
          <li>
            In states that do not allow giving money back at or after closing, VeteranPCS
            collects the standard 30% referral fee. In those states, we will consider the
            client, if a Service Member, for a Relocation Grant instead.
          </li>
        </ul>
        <h3>Are you a Brokerage?</h3>
        <p className={bodyParagraph}>
          VeteranPCS is a registered trade name for Solid Oak Realty, Inc., a Colorado
          corporation and real estate brokerage. Referral Partners are not employed by
          VeteranPCS. VeteranPCS features licensed real estate agents from many different
          brokerages.
        </p>
      </>
    ),
  },
  // Section E accordion - How It Works for Mortgage Loan Officers
  '214430af-b230-46fa-99e2-0b4f50077952': {
    id: '214430af-b230-46fa-99e2-0b4f50077952',
    slug: 'how-it-works-for-mortgage-loan-officers',
    title: 'How It Works for Mortgage Loan Officers',
    body: (
      <>
        <p className={bodyParagraph}>
          <em>
            This is a general overview of how our site works with mortgage loan officers,
            or VA Loan Experts. For full terms and conditions, refer to our Marketing
            Services Agreement.
          </em>
        </p>
        <h3>Who qualifies to be a VA Loan Expert?</h3>
        <p className={bodyParagraph}>
          To be featured as a VA Loan Expert on VeteranPCS, you must be one of the
          following:
        </p>
        <ul>
          <li>Currently serving in the U.S. Armed Forces</li>
          <li>A veteran who received an Honorable Discharge</li>
          <li>The spouse of someone who meets either one</li>
        </ul>
        <p className={bodyParagraph}>You must also meet these requirements:</p>
        <ul>
          <li>You must be a licensed Mortgage Loan Officer in good standing.</li>
          <li>You must not charge the 1% loan origination fee.</li>
        </ul>
        <p className={bodyParagraph}>
          Additional requirements are listed in the Marketing Services Agreement. If you are
          interested in becoming a VA Loan Expert, or if you do not meet the exact criteria
          above but believe you should be considered, please{' '}
          <Link href="/contact" className={bodyLink}>
            contact us
          </Link>{' '}
          to discuss.
        </p>
        <h3>What does it cost?</h3>
        <p className={bodyParagraph}>
          VeteranPCS has an annual marketing fee for licensed mortgage lenders to be
          featured on the website. The fee is based on demand in each state and renews each
          calendar year.
        </p>
        <p className={bodyParagraph}>
          Use the Get Listed button on the{' '}
          <Link href="/contact" className={bodyLink}>
            Contact Us page
          </Link>{' '}
          to start the process and schedule a phone interview.
        </p>
        <h3>Are you a lending company or bank?</h3>
        <p className={bodyParagraph}>
          No, we are not a mortgage broker, lending company, or bank. We feature veterans
          and military spouses who are licensed mortgage loan officers from many different
          companies across the nation.
        </p>
      </>
    ),
  },
  // Section E accordion - What Charities Do You Support?
  'ef0bd7c2-bfce-4444-b577-ea8782774d44': {
    id: 'ef0bd7c2-bfce-4444-b577-ea8782774d44',
    slug: 'what-charities-do-you-support',
    title: 'What Charities Do You Support?',
    body: (
      <>
        <p className={bodyParagraph}>
          VeteranPCS supports multiple veteran-focused charities that benefit service
          members and their families.
        </p>
        <p className={bodyParagraph}>
          If you would like to recommend a charity, please visit our{' '}
          <Link href="/contact" className={bodyLink}>
            contact page
          </Link>{' '}
          to email us.
        </p>
      </>
    ),
  },
};

export type MoveInBonusContent = {
  /** JSX transcription of the moveInBonus document's `description` blocks. */
  description: ReactNode;
  /** JSX transcription of the moveInBonus document's `requirements` blocks. */
  requirements: ReactNode;
};

// Section B - How the VeteranPCS Bonus Works (moveInBonus.json,
// _id 2c430069-d62a-4f21-b819-b9145f11a3eb). The bonus table is NOT
// transcribed here; it renders from MOVE_IN_BONUS.bonusTable loader data.
export const MOVE_IN_BONUS_CONTENT: MoveInBonusContent = {
  description: (
    <>
      <p className={bodyParagraph}>
        We distribute the VeteranPCS Bonus when you close on a property, based on the
        schedule below.
      </p>
      <ul>
        <li>
          The VeteranPCS Bonus is offered in most states. Due to local regulations, it may
          not be available in your state.
        </li>
        <li>In some states, a relocation grant may be available in place of the bonus.</li>
        <li>
          We will reach out once you begin using the service. If the bonus is not available
          in your state, we will let you know so you can apply for a Relocation Grant.
        </li>
      </ul>
    </>
  ),
  requirements: (
    <>
      <h3>Bonus requirements</h3>
      <ul>
        <li>Sign and submit the VeteranPCS Bonus Agreement.</li>
        <li>
          Affirm your status as a Service Member in that agreement (see Who Is Eligible for
          the Bonus).
        </li>
      </ul>
    </>
  ),
};

export type FaqJsonLdPair = {
  question: string;
  answer: string;
};

/**
 * FAQPage JSON-LD pairs (GEO/AI-answer-engine play, not a Google rich-result
 * claim). Each answer must appear verbatim as a single block in the rendered
 * page copy; a consistency test asserts that.
 */
export const FAQ_JSONLD: ReadonlyArray<FaqJsonLdPair> = [
  {
    question: 'What does it cost?',
    answer:
      'The VeteranPCS service is free to use. Your agent pays VeteranPCS a referral fee. The fee comes out of the commission they earn when you buy or sell a home through the site.',
  },
  {
    question: 'Who is eligible for the bonus?',
    answer:
      'The VeteranPCS Bonus is for current service members, veterans with an honorable discharge, and their spouses.',
  },
  {
    question: 'Are you a brokerage?',
    answer:
      'VeteranPCS is a registered trade name for Solid Oak Realty, Inc., a Colorado corporation and real estate brokerage. Referral Partners are not employed by VeteranPCS. VeteranPCS features licensed real estate agents from many different brokerages.',
  },
  {
    question: 'Are you a lending company or bank?',
    answer:
      'No, we are not a mortgage broker, lending company, or bank. We feature veterans and military spouses who are licensed mortgage loan officers from many different companies across the nation.',
  },
  {
    question: 'What charities do you support?',
    answer:
      'VeteranPCS supports multiple veteran-focused charities that benefit service members and their families.',
  },
];
