import React from "react";

const BreakEvenExamples = () => {
  return (
    <>
      <div>
        <h2 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[25px] text-[25px] font-bold my-2">
          Break Even Point Examples
        </h2>
      </div>
      <div className="mt-3 mb-5">
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal mb-4">
          When it comes to refinancing, for example on a $400k loan with a 7% rate, you look into a refinance where every 1/8 of a point is usually about $28 in monthly payment equivalent.
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
          So if you refinance down to a 6.25% (6/8 × $28 = $168), you would save about $168 a month in principal and interest reduction. If the refinance costs you $4k in closing costs, then your break even point would be 23.8 months. This means if you refinance in 12 months again (as you can refinance every 210 days from your first payment), you are losing about 11.2 months of cost in the refi the first time you did it.
        </p>
      </div>
    </>
  );
};

export default BreakEvenExamples;
