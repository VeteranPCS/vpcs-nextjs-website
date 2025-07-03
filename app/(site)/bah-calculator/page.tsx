import BAHCalculator from '@/components/BAHCalculator';
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const META_TITLE = "2025 BAH Calculator - Military Housing Allowance Calculator";
const META_DESCRIPTION = "Calculate your 2025 Basic Allowance for Housing (BAH) rates instantly. Enter your paygrade, dependent status, and duty station to see monthly and annual BAH amounts. Free military housing calculator for all ranks and locations.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL || ""),
    title: {
        template: "%s | VeteranPCS",
        default: META_TITLE,
    },
    alternates: {
        canonical: `${BASE_URL}/bah-calculator`,
    },
    description: META_DESCRIPTION,
    keywords: [
        "BAH calculator",
        "Basic Allowance for Housing",
        "military housing allowance",
        "2025 BAH rates",
        "military calculator",
        "housing allowance calculator",
        "BAH rates by zip code",
        "military pay calculator",
        "PCS calculator",
        "military benefits"
    ],
    openGraph: {
        type: "website",
        locale: "en_US",
        url: `${BASE_URL}/bah-calculator`,
        siteName: "VeteranPCS",
        title: META_TITLE,
        description: META_DESCRIPTION,
        images: [
            {
                url: `${BASE_URL}/opengraph/og-logo.png`,
                width: 1200,
                height: 630,
                alt: "VeteranPCS BAH Calculator",
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

export default function BAHPage(): JSX.Element {
    return (
        <div id="bah-calculator" className="mt-10 bg-gray-100 py-8 lg:pt-24 lg:pb-8">
            <BAHCalculator />
        </div>
    );
}