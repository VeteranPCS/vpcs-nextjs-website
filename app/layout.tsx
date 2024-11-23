import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | VeteranPCS',
    default: "Connecting Veterans & Military Spouses with Trusted Real Estate Agents Nationwide",
  },
  description: "VeteranPCS offers a nationwide network of veteran and military spouse real estate agents who understand the unique challenges of military relocations. Buy or sell your home with confidence and receive a Move-In Bonus up to $4,000. Supporting military families every step of the way.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
