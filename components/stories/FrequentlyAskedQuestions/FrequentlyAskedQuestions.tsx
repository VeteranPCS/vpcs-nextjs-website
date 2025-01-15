"use client";
import { useState, useEffect, useCallback } from "react";
import AccordionItem from "@/components/common/AccordionItem";
import commonService from "@/services/commonServices";
import Script from "next/script";
import { WithContext, FAQPage } from "schema-dts";

export type FreqAskedQuestionsProps = {
  _id: string;
  question: string;
  answer: string;
};

export default function ControlledAccordions() {
  const [expanded, setExpanded] = useState<string | false>("panel1");
  const [questions, setQuestions] = useState<FreqAskedQuestionsProps[] | null>(
    []
  );

  const fetchQuestion = useCallback(async () => {
    try {
      const response = await commonService.fetchFrequentlyAskedQuestions();
      setQuestions(response);
    } catch (error) {
      console.error("Error fetching Frequently Asked questions:", error);
      return (
        <div>
          <p>
            Failed to load Frequently Asked questions. Please try again later.
          </p>
        </div>
      );
    }
  }, []);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const handleChange = (panel: string) => {
    setExpanded(expanded === panel ? false : panel); // Toggle panel visibility
  };
  const jsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions?.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    })) || []
  };

  return (
    <div className="container lg:w-[50%] md:w-[75%] sm:w-full w-full mx-auto py-12 sm:pt-12 px-9 sm:px-0">
      <div>
        <h1 className="text-[#7E1618] poppins lg:text-[43px] md:text-[43px] sm:text-[25px] text-[25px] font-semibold mb-10 text-center px-8 sm:px-0">
          PCS Frequently Asked Questions
        </h1>
        <Script id={`json-ld-faqs`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
      {questions?.map((question) => (
        <AccordionItem
          key={question._id}
          id={question._id}
          title={question.question}
          content={question.answer}
          expanded={expanded}
          handleChange={handleChange}
        />
      ))}
    </div>
  );
}
