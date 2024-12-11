import InternshipHeroSection from "@/components/Internship/InternshipHeroSection/InternshipHeroSection";
import Internshipblogsection from "@/components/Internship/internshipblogsection/internshipblogsection";
import InternshipApplication from "@/components/Internship/internshipapplication/internshipapplication";
import Internshipdetails from "@/components/Internship/Interashipdetails/Interashipdetails";
import ReceiveOffCourses from "@/components/Internship/receiveoffcourses/receiveoffcourses";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)
export default function Home() {
  return (
    <main>
      <InternshipHeroSection />
      <Internshipblogsection />
      <InternshipApplication />
      <Internshipdetails />
      <ReceiveOffCourses />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
