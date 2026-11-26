import "../globals.css";
import "../steph.css";
import { ImpactProvider } from "@/components/redesign/ImpactProvider";
import { BotIdClient } from "botid/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer/Footer"
import { ConciergeProvider, ConciergeWidget } from "@/components/Concierge"
import { featureFlags } from "@/lib/feature-flags";
import { isProductionSalesforceRuntime } from "@/lib/salesforce/environment.mjs";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const production = isProductionSalesforceRuntime();
  const browserFixture = process.env.VPCS_BROWSER_FIXTURE === '1'
    && process.env.VPCS_SALESFORCE_PROFILE === 'mock'
    && process.env.NODE_ENV === 'development'
    && process.env.VERCEL !== '1';
  const conciergeEnabled = featureFlags.conciergeEnabled && (production || browserFixture);
  return (
    <ConciergeProvider><ImpactProvider>
      {conciergeEnabled && production && (
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
