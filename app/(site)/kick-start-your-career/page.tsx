import { Metadata } from "next";
import InternshipApplicationForm from "@/components/Internship/internshipapplication/InternshipForm"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Real Estate Internships for Veterans & Military Spouses - Launch Your Career with VeteranPCS";
const META_DESCRIPTION = "Kickstart your real estate career with VeteranPCS's tailored internships for veterans and military spouses. Gain hands-on experience, receive a 40% discount on pre-licensing courses, and connect with trusted agents nationwide. Apply now to start your journey in the real estate industry.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL || ""),
    title: {
        template: "%s | VeteranPCS",
        default: META_TITLE,
    },
    description: META_DESCRIPTION,
    alternates: {
        canonical: `${BASE_URL}/kick-start-your-career`,
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



function InternshipApplicationPage() {
    return (
        <div>
            <InternshipApplicationForm />
        </div>
    )
}

export default InternshipApplicationPage