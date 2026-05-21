import "../globals.css";
import { BotIdClient } from "botid/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer/Footer"
import { ConciergeProvider, ConciergeWidget } from "@/components/Concierge"


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConciergeProvider>
      <BotIdClient protect={[{ path: '/api/chat', method: 'POST' }]} />
      <Header />
      {children}
      <Footer />
      <ConciergeWidget />
    </ConciergeProvider>
  );
}
