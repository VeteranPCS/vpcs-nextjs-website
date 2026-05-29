'use client';

export interface AgentListItem {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  brokerage?: string;
  city?: string;
  militaryStatus?: string;
  militaryService?: string;
}

interface Props {
  list: AgentListItem[];
  kind: 'agent' | 'lender';
  onSelect?(item: AgentListItem): void;
}

export default function AgentCard({ list, kind, onSelect }: Props) {
  if (!list || list.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
        No matches available right now. A team member can hand-match you — just ask.
      </div>
    );
  }

  const label = kind === 'agent' ? 'agent' : 'lender';

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        Top {label}{list.length === 1 ? '' : 's'} for you
      </p>
      <ul className="flex flex-col gap-2">
        {list.slice(0, 5).map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primary">{item.name}</span>
              {item.brokerage ? (
                <span className="text-xs text-gray-600">{item.brokerage}</span>
              ) : null}
              {item.city ? (
                <span className="text-xs text-gray-500">{item.city}</span>
              ) : null}
            </div>
            {item.militaryStatus || item.militaryService ? (
              <div className="flex flex-wrap gap-1">
                {item.militaryStatus ? (
                  <span className="inline-block rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5">
                    {item.militaryStatus}
                  </span>
                ) : null}
                {item.militaryService ? (
                  <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5">
                    {item.militaryService}
                  </span>
                ) : null}
              </div>
            ) : null}
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent-red px-3 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-accent-red-dark"
              >
                Connect with {item.firstName || item.name}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
