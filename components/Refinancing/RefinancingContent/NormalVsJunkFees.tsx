import React from "react";

const NormalVsJunkFees = () => {
  return (
    <>
      <div>
        <h2 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[25px] text-[25px] font-bold my-2">
          What Fees Are Normal vs. Junk Fees
        </h2>
      </div>
      <div className="mt-3 mb-5">
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-3">
          Normal Fees
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal mb-5">
          The typical fees associated with a refinance are a credit report fee, lender fee, VA funding fee, title fees, recording fee, and taxes and insurance escrows. If your escrows can&apos;t be transferred then you will receive the current escrow balance back after closing in the form of a check and the new lender will collect new taxes and homeowners insurance.
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-3">
          Junk Fees to Avoid
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
          The typical junk fees that you see on refinances are processing fee, lock fee, admin fee, and underwriting fee. Most lenders will waive these on refinances.
        </p>
      </div>
    </>
  );
};

export default NormalVsJunkFees;
