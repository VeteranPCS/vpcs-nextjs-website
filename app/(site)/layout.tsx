import "../globals.css";
import "../steph.css";
import { ImpactProvider } from "@/components/redesign/ImpactProvider";
import { BotIdClient } from "botid/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer/Footer"
import { ConciergeProvider, ConciergeWidget } from "@/components/Concierge"
import { featureFlags } from "@/lib/feature-flags";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const conciergeEnabled = featureFlags.conciergeEnabled;
  return (
    <ConciergeProvider><ImpactProvider>
      {conciergeEnabled && (
        <BotIdClient
          protect={[
            {
              path: '/api/chat',
              method: 'POST',
              advancedOptions: { checkLevel: 'deepAnalysis' },
            },
          ]}
        />
      )}
      <Header />
      <div className="site-header-addition">{children}</div>
      <Footer />
      {conciergeEnabled && <ConciergeWidget />}
    </ImpactProvider></ConciergeProvider>
  );
}
