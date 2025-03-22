import { Metadata } from "next";
import InternshipHeroSection from "@/components/Internship/InternshipHeroSection/InternshipHeroSection";
import Internshipblogsection from "@/components/Internship/internshipblogsection/internshipblogsection";
import InternshipApplication from "@/components/Internship/internshipapplication/internshipapplication";
import Internshipdetails from "@/components/Internship/Interashipdetails/Interashipdetails";
import ReceiveOffCourses from "@/components/Internship/receiveoffcourses/receiveoffcourses";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Military to Real Estate: Career Programs for Veterans & Military Spouses";
const META_DESCRIPTION = "Transition your military leadership skills to a rewarding real estate career. Our veteran-focused internship program offers 40% off licensing courses, hands-on mentorship with successful military-affiliated agents, and flexible schedules that work with PCS moves and deployments.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  description: META_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/internship`,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${BASE_URL}/opengraph/og-logo.png`,
        width: 1200,
        height: 630,
        alt: "VeteranPCS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    description: META_DESCRIPTION,
    title: META_TITLE,
    images: ['/opengraph/og-logo.png'],
  },
};

export default function InternshipPage() {
  return (
    <main>
      <InternshipHeroSection />
      <Internshipblogsection />
      <InternshipApplication />
      <Internshipdetails />
      <ReceiveOffCourses />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </main>
  );
}
