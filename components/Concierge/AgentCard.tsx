'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface AgentListItem {
  id: string;
  role?: 'agent' | 'lender';
  name: string;
  firstName?: string;
  lastName?: string;
  brokerage?: string;
  city?: string;
  militaryStatus?: string;
  militaryService?: string;
  photoUrl?: string;
  bio?: string;
  contactHref?: string;
  profileHref?: string;
  stateName?: string;
  areaName?: string;
}

interface Props {
  list: AgentListItem[];
  kind: 'agent' | 'lender';
  onSelect?(item: AgentListItem): void;
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'VP';
}

function militaryLine(item: AgentListItem): string {
  return [item.militaryStatus, item.militaryService].filter(Boolean).join(' / ');
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
  const visibleList = list.slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        Top {label}{visibleList.length === 1 ? '' : 's'} for you
      </p>
      <ul className="flex flex-col gap-2">
        {visibleList.map((item) => {
          const firstName = item.firstName || item.name.split(/\s+/)[0] || item.name;
          const contactText = `Start intake with ${firstName}`;
          const profileText = item.stateName
            ? `View on ${item.stateName} page`
            : 'View details';
          const photo = item.photoUrl ? (
            <Image
              src={item.photoUrl}
              alt={`${item.name} headshot`}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
              {initials(item.name)}
            </span>
          );

          return (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex min-w-0 gap-3">
                {item.profileHref ? (
                  <Link
                    href={item.profileHref}
                    className="relative mt-0.5 h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                    aria-label={`View ${item.name} on the ${item.stateName || 'state'} page`}
                  >
                    {photo}
                  </Link>
                ) : (
                  <div className="relative mt-0.5 flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary">
                    {photo}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-col">
                    {item.profileHref ? (
                      <Link
                        href={item.profileHref}
                        className="break-words text-sm font-semibold leading-snug text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="break-words text-sm font-semibold leading-snug text-primary">
                        {item.name}
                      </span>
                    )}
                    {item.brokerage ? (
                      <span className="truncate text-xs text-gray-600">{item.brokerage}</span>
                    ) : null}
                    {item.city ? (
                      <span className="break-words text-xs text-gray-500">{item.city}</span>
                    ) : null}
                  </div>
                  {militaryLine(item) ? (
                    <p className="mt-1 break-words text-xs font-medium text-gray-700">
                      {militaryLine(item)}
                    </p>
                  ) : null}
                </div>
              </div>

              {item.bio ? (
                <p className="overflow-hidden break-words text-xs leading-relaxed text-gray-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {item.bio}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                {item.contactHref ? (
                  <Link
                    href={item.contactHref}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent-red px-3 py-2 text-center text-sm font-medium text-white motion-safe:transition-colors hover:bg-accent-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {contactText}
                  </Link>
                ) : onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent-red px-3 py-2 text-center text-sm font-medium text-white motion-safe:transition-colors hover:bg-accent-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {contactText}
                  </button>
                ) : null}
                {item.profileHref ? (
                  <Link
                    href={item.profileHref}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-center text-xs font-medium text-primary motion-safe:transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                  >
                    {profileText}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
