import { readBahSnapshot } from '@/lib/bah/snapshots.server';

type Props = {
  base: string;
  year: string | number;
  title?: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BahRateTable({ base, year, title }: Props) {
  const snapshot = readBahSnapshot(base, year);

  if (!snapshot) {
    return (
      <aside className="my-6 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-5">
        <p className="tahoma text-lg font-bold text-[#292F6C]">
          BAH rates unavailable
        </p>
        <p className="roboto mt-2 text-sm leading-6 text-[#495057]">
          We do not have a committed BAH snapshot for this base and year yet.
          Verify current rates at{' '}
          <a
            href="https://www.travel.dod.mil/Allowances/Basic-Allowance-for-Housing/BAH-Rate-Lookup/"
            className="font-bold text-[#A81F23] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            travel.dod.mil
          </a>
          .
        </p>
      </aside>
    );
  }

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-[#DDE3EA] bg-white">
      <div className="bg-[#292F6C] px-5 py-4 text-white">
        <h3 className="tahoma text-xl font-bold">
          {title ?? `${snapshot.baseName} BAH Rates (${snapshot.year})`}
        </h3>
        <p className="roboto mt-1 text-sm text-white/85">
          ZIP {snapshot.primaryZip} · {snapshot.ranks[0]?.mha}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#F1F3F5] text-[#292F6C]">
            <tr>
              <th className="px-4 py-3 font-bold">Paygrade</th>
              <th className="px-4 py-3 font-bold">With Dependents</th>
              <th className="px-4 py-3 font-bold">Without Dependents</th>
              <th className="px-4 py-3 font-bold">Difference</th>
            </tr>
          </thead>
          <tbody className="text-[#495057]">
            {snapshot.ranks.map((rank) => (
              <tr key={rank.rankId} className="border-t border-[#E5E7EB]">
                <td className="px-4 py-3 font-bold text-[#212529]">{rank.rank}</td>
                <td className="px-4 py-3">{formatCurrency(rank.withDependents)}</td>
                <td className="px-4 py-3">{formatCurrency(rank.withoutDependents)}</td>
                <td className="px-4 py-3">{formatCurrency(rank.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="roboto px-5 py-4 text-xs leading-5 text-[#6C757D]">
        Source: DTMO BAH rate lookup. Snapshot generated {snapshot.generatedAt.slice(0, 10)}.
        Verify current rates at travel.dod.mil before making housing decisions.
      </p>
    </section>
  );
}
