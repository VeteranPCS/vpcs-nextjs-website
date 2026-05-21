import Link from "next/link";
import type { Metadata } from "next";
import stateService, {
  type StateList,
  type Lenders,
} from "@/services/stateService";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://veteranpcs.com";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const title = "VA Loan Expert Directory";
  const description =
    "Browse our nationwide network of VA loan experts and military-experienced mortgage lenders, organized by state.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/lenders`,
    },
    alternates: {
      canonical: `${BASE_URL}/lenders`,
    },
  };
}

interface StateWithLenders {
  state: StateList;
  lenders: Lenders[];
}

async function getDirectoryData(): Promise<StateWithLenders[]> {
  const states = await stateService.fetchStateList();

  const results = await Promise.all(
    states.map(async (state) => {
      try {
        const data = await stateService.fetchLendersListByState(
          state.short_name,
        );
        const records = data?.records ?? [];

        // Dedupe by AccountId_15__c
        const seen = new Set<string>();
        const deduped: Lenders[] = [];
        for (const lender of records) {
          const key = lender.AccountId_15__c;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(lender);
        }

        // Sort alphabetically by Name
        deduped.sort((a, b) =>
          (a.Name ?? "").localeCompare(b.Name ?? ""),
        );

        return { state, lenders: deduped };
      } catch (error) {
        console.error(
          "Failed to fetch lenders for state:",
          state.short_name,
          error,
        );
        return { state, lenders: [] };
      }
    }),
  );

  // Sort states alphabetically by state_name and drop empty
  return results
    .filter((entry) => entry.lenders.length > 0)
    .sort((a, b) =>
      (a.state.state_name ?? "").localeCompare(b.state.state_name ?? ""),
    );
}

function formatLenderLine(lender: Lenders): string {
  const brokerage = lender.Brokerage_Name__pc ?? "";
  const nmls = lender.Individual_NMLS_ID__pc?.trim();
  const base = `${lender.Name} — ${brokerage}`;
  return nmls ? `${base} (NMLS #${nmls})` : base;
}

export default async function LendersDirectoryPage() {
  let directory: StateWithLenders[] | null = null;
  let hasError = false;

  try {
    directory = await getDirectoryData();
  } catch (error) {
    console.error("Failed to load lenders directory:", error);
    hasError = true;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">
          VA Loan Expert Directory
        </h1>
        <p className="text-base text-gray-700">
          Browse our nationwide network of VA loan experts and
          military-experienced mortgage lenders, organized by state. Click any
          state to find a lender who knows VA loans and the unique needs of
          military families.
        </p>
      </header>

      {hasError || !directory ? (
        <p className="text-gray-700">
          Our lender directory is temporarily unavailable. Please check back
          shortly.
        </p>
      ) : directory.length === 0 ? (
        <p className="text-gray-700">
          No lenders are currently listed. Please check back soon.
        </p>
      ) : (
        directory.map(({ state, lenders }) => (
          <section key={state.short_name} className="space-y-3">
            <h2 className="text-2xl font-semibold">{state.state_name}</h2>
            <p className="text-sm text-gray-600">
              {lenders.length}{" "}
              {lenders.length === 1 ? "lender" : "lenders"}
            </p>
            <ul className="space-y-2">
              {lenders.map((lender) => (
                <li key={lender.AccountId_15__c}>
                  <Link
                    href={`/${state.state_slug.current}`}
                    className="text-blue-700 hover:underline"
                  >
                    {formatLenderLine(lender)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
