import { Metadata } from 'next';
import VALoanLanding from '@/components/VALoanLanding/VALoanLanding';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://veteranpcs.com";
const META_TITLE = "VA Loan Guidance & Resources";
const META_DESCRIPTION = "Don’t overpay using your VA loan, make the VA Loan work for you! Download our free VA Loan guide to learn more about the VA loan and how it can work for you.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL || "https://veteranpcs.com"),
    title: {
        template: "%s | VeteranPCS",
        default: META_TITLE,
    },
    description: META_DESCRIPTION,
    alternates: {
        canonical: `${BASE_URL}/va-loan-help`,
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

export default function VaLoanPage() { return <VALoanLanding/>; }
