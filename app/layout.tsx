import type { Metadata } from "next";
import { Inter, Poppins, Roboto, Lora } from "next/font/google";
import "./globals.css";
import { RealEstateAgent, WithContext } from "schema-dts";
import Script from "next/script";
import { GoogleTagManager } from '@next/third-parties/google'
import { SpeedInsights } from "@vercel/speed-insights/next"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "";

const inter = Inter({
    subsets: ["latin"],
    display: 'swap',
    variable: '--font-inter',
});

const poppins = Poppins({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-poppins',
});

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
});

const lora = Lora({
    weight: ['400', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-lora',
});

const META_TITLE = "Military Members & Veterans: Get a Top Agent, VA Loan Support & Up to $4,000, for Free";
const META_DESCRIPTION = "Tired of navigating the home buying process alone during every PCS? With VeteranPCS, get a trusted veteran or military spouse agent, expert VA loan guidance, and a Move In Bonus up to $4,000—so you save money, avoid costly mistakes, and buy or sell with confidence. No cost, no hassle, just results.";

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

const jsonLd: WithContext<RealEstateAgent> =
{
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    url: BASE_URL,
    name: "VeteranPCS",
    description: "VeteranPCS was created by veterans for veterans to help make your next PCS move your best PCS move using our agents, lenders, and resources.",
    logo: `${BASE_URL}/opengraph/og-logo.png`,
    image: [
        {
            "@type": "ImageObject",
            url: `${BASE_URL}/opengraph/og-logo.png`,
        }
    ],
    telephone: "+1 719-445-7845",
    address: {
        "@type": "PostalAddress",
        streetAddress: "415 N. Tejon St.",
        addressLocality: "Colorado Spring",
        postalCode: "CO 809003",
        addressCountry: "USA"
    },
    geo: {
        "@type": "GeoCoordinates",
        latitude: "38.859055",
        longitude: "-104.813499"
    },
    openingHours: [
        "Mon - Fri 9:00 am - 17:00 pm",
        "Sat - 9:00 am - 17:00 pm"
    ],
    priceRange: "$",
    brand: {
        "@type": "Brand",
        name: "VeteranPCS",
        logo: `${BASE_URL}/opengraph/og-logo.png`
    },
    email: 'info@veteranpcs.com',
    knowsAbout: ["military relocation", "veteran real estate agents", "military spouse real estate agents", "VA loan", "PCS move"],
    slogan: "Together we'll make it home.",
    sameAs: [
        "https://www.linkedin.com/company/veteranpcs/",
        "https://www.facebook.com/VeteranPCS/",
        "https://www.instagram.com/veteranpcs/",
        "https://www.tiktok.com/@veteranpcs",
    ],
    aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        reviewCount: "76"
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${poppins.variable} ${roboto.variable} ${lora.variable}`}>
            <head>
                <GoogleTagManager gtmId={GTM_ID} />
                <Script defer src="https://www.google.com/recaptcha/api.js"></Script>
                <Script id={`json-ld-real-estate-agent`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </head>
            <body className={inter.className}>
                {children}
                <SpeedInsights />
            </body>
        </html>
    );
}