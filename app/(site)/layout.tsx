import { Inter } from "next/font/google";
import "../globals.css";
import "@/styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer/Footer"

const inter = Inter({ subsets: ["latin"] });


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <body className={inter.className}>
      <Header />
      {children}
      <Footer />
    </body>
  );
}