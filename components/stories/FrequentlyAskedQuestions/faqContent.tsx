import type { ReactNode } from 'react';

// Classes match the paragraph/link rendering the answers previously got from
// components/Blog/BlockContent so the accordions look identical.
const answerParagraph = 'mb-6 text-gray-700 leading-relaxed';
const answerLink = 'text-blue-600 hover:text-blue-800 underline';

/**
 * FAQ answers hand-transcribed from the Sanity `frequently_asked_questions`
 * Portable Text export (content/_data/site/frequently_asked_questions.json),
 * keyed by document `_id`. Question titles and the JSON-LD answer text still
 * come from services/commonServices; only the rendered answer body lives here
 * so links and emphasis stay freely editable JSX.
 *
 * Editing an answer? lib/content/__tests__/faq-parity.test.tsx compares this
 * module's rendered output against the exported JSON; update or retire that
 * check deliberately if the copy is meant to diverge from the export.
 */
export const FAQ_ANSWERS: Record<string, ReactNode> = {
  // Am I disqualified if I have a bankruptcy or foreclosure on record?
  '02740d91-5185-4a23-a04b-dbd6f35565aa': (
    <p className={answerParagraph}>
      Not always. Foreclosures and bankruptcies do not automatically disqualify borrowers for
      future loans. Depending on the circumstances, there will be a waiting period before you
      can qualify for a mortgage again. To best understand, and to see if there are exceptions
      for your circumstances its best to speak with one of our VA Loan experts.
    </p>
  ),
  // How do I know how much I'm qualified for with a VA Loan?
  '0590ae58-22ef-444d-8d7e-835df6713efb': (
    <p className={answerParagraph}>
      The best way to identify how much purchasing power you have, or what price of home you
      would be approved for, would be to go through a pre-approval application with one of our
      VA Loan experts. Every person’s finances are different. One of our experts can assess
      your income, type of pay, debts, assets, and credit and give you an assured number to
      help base your home search on.
    </p>
  ),
  // How Many Times Can I Use My VA Home Loan Benefit?
  '4b94b27d-eb99-48f6-8325-f4a050691522': (
    <p className={answerParagraph}>
      Multiple times. If you buy a home with a VA loan and then sell that home your VA
      entitlement will be restored in full, allowing you to purchase your next home with no
      limit on the purchase price. You can do this as many times you need in your lifetime. If
      you keep a previous home on the VA loan as a rental property, and want to buy a second
      home, you are now limited to your remaining entitlement. Calculating your remaining
      entitlement is best with one of our VeteranPCS VA Loan experts as it depends on the
      county loan limit in the county where you’re purchasing next. There is also a
      One-Time-Restoration if you refinance a previous home to, say, a conventional loan,
      allowing you to free up your full entitlement for your next purchase.
    </p>
  ),
  // Are There Closing Costs Associated with a VA Loan?
  '678504db-1654-4a12-8fab-ac22c36c2620': (
    <p className={answerParagraph}>
      Yes, there are always closing costs when purchasing a home with a VA loan; however, who
      pays those closing costs depends on the transaction. You’re not required to have a down
      payment with a VA loan (in most cases), but there will still be closing costs. It’s good
      to plan for roughly 2% of the home price in closing costs. Depending on the market, your
      VeteranPCS real estate agent may be able to negotiate seller concessions to pay part, or
      all, of those closing costs.
    </p>
  ),
  // Can I Have Two VA Loans?
  'f7209c53-99e9-43bd-8d39-c29f95f7a95c': (
    <p className={answerParagraph}>
      Yes, but, as with most things with the VA loan, it depends on the circumstances. The VA
      Loan is intended to help service members and veterans obtain home ownership for their
      primary residence. If you want to keep one home on the VA loan and purchase a second you
      are allowed but it depends on remaining entitlement. Even if you go above your remaining
      entitlement, you can, you just need to put 25% down of the difference over your remaining
      entitlement.
    </p>
  ),
  // How do I apply for a VA guaranteed loan?
  'ff9361e6-5aa1-4ea2-ba12-1e52a1122105': (
    <p className={answerParagraph}>
      First verify that you are eligible. The fastest way to verify eligibility and determine
      the amount of the entitlement is to use VA’s eBenefits website (
      <a
        href="http://www.ebenefits.va.gov/ebenefits/homepage"
        className={answerLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        www.ebenefits.va.gov/ebenefits/homepage
      </a>
      ). You can check loan benefits and entitlements and download a Certificate of Eligibility
      (COE). Or, you can speak with one of our VA Loan experts and they can pull your COE for
      you through their portal.
    </p>
  ),
};
