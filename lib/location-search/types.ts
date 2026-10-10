export type LocationSearchResult =
  | { outcome: 'resolved'; href: string; label: string; stateSlug: string }
  | { outcome: 'needs_state'; message: string; states: { name: string; code: string }[] }
  | { outcome: 'not_found'; message: string };
