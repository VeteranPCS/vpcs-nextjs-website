'use client';

interface Props {
  state: {
    state_name?: string;
    short_name?: string;
  };
}

export default function StateCard({ state }: Props) {
  const stateName = state?.state_name || 'This state';
  const shortName = state?.short_name;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-gray-500">State</span>
        <span className="text-sm font-semibold text-primary">{stateName}</span>
      </div>
      {shortName ? (
        <span className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-semibold px-2 py-1">
          {shortName}
        </span>
      ) : null}
    </div>
  );
}
