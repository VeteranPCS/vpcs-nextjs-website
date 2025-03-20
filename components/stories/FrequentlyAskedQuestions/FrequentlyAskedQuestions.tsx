import { WithContext, FAQPage } from "schema-dts";
import AccordionItem from "@/components/common/AccordionItem";
import commonService from "@/services/commonServices";
import Script from "next/script";

export type FreqAskedQuestionsProps = {
  _id: string;
  question: string;
  answer: string;
};

export default async function FrequentlyAskedQuestions() {
  const questions = await commonService.fetchFrequentlyAskedQuestions();

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
        />
      ))}
    </div>
  );
}
