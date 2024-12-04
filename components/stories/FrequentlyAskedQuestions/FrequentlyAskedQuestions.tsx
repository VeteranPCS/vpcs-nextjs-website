"use client";
import { useState } from "react";
import AccordionItem from "../../common/AccordionItem";

export default function ControlledAccordions() {
  const [expanded, setExpanded] = useState<string | false>("panel1");

  const handleChange = (panel: string) => {
    setExpanded(expanded === panel ? false : panel); // Toggle panel visibility
  };

  return (
    <div className="container lg:w-[50%] md:w-[75%] sm:w-full w-full mx-auto py-12">
      <div>
        <h1 className="text-[#7E1618] poppins lg:text-[43px] md:text-[43px] sm:text-[31px] text-[31px] font-semibold mb-10 text-center">
          PCS Frequently Asked Questions
        </h1>
      </div>
      <AccordionItem
        id="panel1"
        title="How do I apply for a VA guaranteed loan?"
        content="You can apply for a VA loan with any mortgage lender that participates in the VA home loan program. At some point, you will need to get a Certificate of Eligibility from VA to prove to the lender that you are eligible for a VA loan."
        expanded={expanded}
        handleChange={handleChange}
      />
      <AccordionItem
        id="panel2"
        title="Are There Closing Costs Associated with a VA Loan?"
        content="You can apply for a VA loan with any mortgage lender that participates in the VA home loan program. At some point, you will need to get a Certificate of Eligibility from VA to prove to the lender that you are eligible for a VA loan."
        expanded={expanded}
        handleChange={handleChange}
      />
      <AccordionItem
        id="panel3"
        title="How Many Times Can I Use My VA Home Loan Benefit?"
        content="You can apply for a VA loan with any mortgage lender that participates in the VA home loan program. At some point, you will need to get a Certificate of Eligibility from VA to prove to the lender that you are eligible for a VA loan."
        expanded={expanded}
        handleChange={handleChange}
      />
      <AccordionItem
        id="panel4"
        title="Can I Have Two VA Loans?"
        content="You can apply for a VA loan with any mortgage lender that participates in the VA home loan program. At some point, you will need to get a Certificate of Eligibility from VA to prove to the lender that you are eligible for a VA loan."
        expanded={expanded}
        handleChange={handleChange}
      />
    </div>
  );
}
