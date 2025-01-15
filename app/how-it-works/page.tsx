import { Metadata } from "next";
import HowItWorkHeroSection from "@/components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import HowItWorkText from "@/components/HowItWork/HowItWorkText/HowItWorkText";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "How VeteranPCS Connects Military Families with Trusted Real Estate Agents";
const META_DESCRIPTION = "Learn how VeteranPCS simplifies your move by connecting you with veteran or military spouse real estate agents. Enjoy a seamless process, receive a Move-In Bonus up to $4,000, and contribute to veteran-focused charities with each transaction.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  description: META_DESCRIPTION,
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

export default function Home() {
  return (
    <>
      <HowItWorkHeroSection />
      <Covered />
      <HowItWorkText />
      <KeepInTouch />
      <Footer />
    </>
  );
}
