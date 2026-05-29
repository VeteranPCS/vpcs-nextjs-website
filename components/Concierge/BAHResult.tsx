'use client';

import type { BAHData } from '@/lib/bah-scraper';

interface Props {
  data: Partial<BAHData>;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatAmount(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return currency.format(value);
}

export default function BAHResult({ data }: Props) {
  if (data?.isValid === false) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
        I could not find a BAH rate for that ZIP and rank. Double-check the inputs and try again.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500">BAH Estimate</span>
        <span className="text-xs text-gray-500">
          {data?.year ?? ''} {data?.rank ? `· ${data.rank}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-primary/5 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">With dependents</p>
          <p className="text-base font-semibold text-primary">
            {formatAmount(data?.withDependents)}
            <span className="ml-1 text-xs font-normal text-gray-500">/mo</span>
          </p>
        </div>
        <div className="rounded-md bg-primary/5 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Without dependents</p>
          <p className="text-base font-semibold text-primary">
            {formatAmount(data?.withoutDependents)}
            <span className="ml-1 text-xs font-normal text-gray-500">/mo</span>
          </p>
        </div>
      </div>
      <p className="text-[11px] text-gray-500">
        ZIP {data?.zipCode || '—'}
        {data?.mha ? ` · MHA ${data.mha}` : ''}
      </p>
    </div>
  );
}
