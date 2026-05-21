import type { Metadata } from "next";
import Link from "next/link";
import stateService, { type Agent, type StateList } from "@/services/stateService";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://veteranpcs.com";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Veteran Real Estate Agent Directory";
  const description =
    "Browse our nationwide network of military-experienced real estate agents and veteran/military-spouse REALTORS, organized by state.";
  const url = `${BASE_URL}/agents`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

interface StateAgentsGroup {
  state: StateList;
  agents: Agent[];
}

async function loadDirectory(): Promise<StateAgentsGroup[] | null> {
  try {
    const states = await stateService.fetchStateList();

    const groups = await Promise.all(
      states.map(async (state): Promise<StateAgentsGroup> => {
        try {
          const data = await stateService.fetchAgentsListByState(state.short_name);
          const records = data?.records ?? [];

          // Dedupe by AccountId_15__c within this state, then sort by Name.
          const seen = new Set<string>();
          const unique = records.filter((agent) => {
            const key = agent.AccountId_15__c;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          unique.sort((a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""));

          return { state, agents: unique };
        } catch (err) {
          console.error("Failed to fetch agents for state %s:", state.short_name, err);
          return { state, agents: [] };
        }
      }),
    );

    // Sort states alphabetically by state_name.
    groups.sort((a, b) =>
      (a.state.state_name ?? "").localeCompare(b.state.state_name ?? ""),
    );

    return groups;
  } catch (err) {
    console.error("Failed to load agent directory:", err);
    return null;
  }
}

export default async function AgentsDirectoryPage() {
  const groups = await loadDirectory();

  if (!groups) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Veteran Real Estate Agent Directory</h1>
        <p className="text-gray-700">Directory temporarily unavailable. Please check back soon.</p>
      </main>
    );
  }

  const populatedGroups = groups.filter((group) => group.agents.length > 0);

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Veteran Real Estate Agent Directory</h1>
        <p className="text-gray-700">
          Browse VeteranPCS&rsquo;s nationwide network of veteran and military-spouse
          real estate agents, organized by state. Click a state below to learn more
          about the agents who serve there.
        </p>
      </header>

      {populatedGroups.length === 0 ? (
        <p className="text-gray-700">No agents are listed at this time.</p>
      ) : (
        populatedGroups.map((group) => {
          const stateSlug = group.state.state_slug?.current;
          const stateHref = stateSlug ? `/${stateSlug}` : "#";

          return (
            <section key={group.state.short_name} className="space-y-3">
              <h2 className="text-2xl font-semibold">
                {stateSlug ? (
                  <Link href={stateHref} className="hover:underline">
                    {group.state.state_name}
                  </Link>
                ) : (
                  group.state.state_name
                )}
              </h2>
              <p className="text-sm text-gray-600">
                {group.agents.length} {group.agents.length === 1 ? "agent" : "agents"}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                {group.agents.map((agent) => {
                  const brokerage = agent.Brokerage_Name__pc?.trim() || "Independent";
                  const status = agent.Military_Status__pc?.trim() || "Veteran-affiliated";
                  return (
                    <li key={`${group.state.short_name}-${agent.AccountId_15__c}`}>
                      <Link href={stateHref} className="text-blue-700 hover:underline">
                        {agent.Name}
                      </Link>
                      {" — "}
                      {brokerage} ({status})
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
