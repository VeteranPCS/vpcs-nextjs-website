import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/globals.css";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"; // Import wrapper
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default:
      "Connecting Veterans & Military Spouses with Trusted Real Estate Agents Nationwide",
  },
  description:
    "VeteranPCS offers a nationwide network of veteran and military spouse real estate agents who understand the unique challenges of military relocations. Buy or sell your home with confidence and receive a Move-In Bonus up to $4,000. Supporting military families every step of the way.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${BASE_URL}/opengraph/vpcs-logo-no-background.png`,
        width: 1200,
        height: 630,
        alt: "VeteranPCS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    description: "Connecting Veterans & Military Spouses with Trusted Real Estate Agents Nationwide",
    title: "VeteranPCS",
    images: ['/opengraph/vpcs-logo-no-background.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script defer src="https://www.google.com/recaptcha/api.js"></script>
      </head>
      <body className={inter.className}>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}