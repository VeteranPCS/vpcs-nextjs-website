import states from '@/content/_data/us-states.json';

export interface USState {
  code: string;
  name: string;
  slug: string;
}

export const US_STATES = states as readonly USState[];

export const US_STATE_CODES: readonly string[] = US_STATES.map((s) => s.code);
