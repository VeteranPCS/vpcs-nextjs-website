import { US_STATES } from '@/constants/usStates';
import type { RoutingState } from '@/lib/ai/routing/types';

export const ROUTING_STATES: readonly RoutingState[] = US_STATES;

export function slugifyRoutingText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bft\b/g, 'fort')
    .replace(/\bsfb\b/g, 'space force base')
    .replace(/\bafb\b/g, 'air force base')
    .replace(/\bjb\b/g, 'joint base')
    .replace(/\baafa\b/g, 'air force academy')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeCompactText(input: string): string {
  return normalizeSearchText(input).replace(/\s+/g, '');
}

export function findRoutingState(input?: string | null): RoutingState | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const slug = slugifyRoutingText(trimmed);
  const compact = normalizeCompactText(trimmed);

  return (
    ROUTING_STATES.find((state) => state.code.toLowerCase() === trimmed.toLowerCase()) ??
    ROUTING_STATES.find((state) => state.slug === slug) ??
    ROUTING_STATES.find((state) => normalizeCompactText(state.name) === compact) ??
    null
  );
}

export function stateMatches(areaState: string | undefined, target: RoutingState): boolean {
  const normalized = findRoutingState(areaState);
  if (normalized) return normalized.code === target.code;
  return normalizeCompactText(areaState ?? '') === normalizeCompactText(target.name);
}

export function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
