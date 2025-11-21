import React from "react";

const HelocAndHeloan = () => {
  return (
    <>
      <div>
        <h2 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[25px] text-[25px] font-bold my-2">
          HELOCs and HELOANs
        </h2>
      </div>
      <div className="mt-3 mb-5">
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-3">
          Home Equity Lines of Credit (HELOC)
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal mb-5">
          A Home Equity Line of Credit (HELOC) is a line of credit you can borrow against. HELOCs are either fixed or variable. Variable usually has a little better rate but is also variable each year. Fixed is exactly that. You know what you are getting and it doesn&apos;t change.
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-3">
          Home Equity Loan (HELOAN)
        </p>
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
          A Home Equity Loan is a second loan on the property and is paid out at close, where a HELOC you draw on it as needed. The HELOAN usually has better rates and a smaller payment as it is amortized over a longer period of time.
        </p>
      </div>
    </>
  );
};

export default HelocAndHeloan;
