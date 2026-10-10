/** Established VeteranPCS closing-bonus tiers. Amounts remain estimates. */
export function calculateMovingBonus(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value < 100000) return 200;
  if (value < 200000) return 400;
  if (value < 300000) return 700;
  if (value < 400000) return 1000;
  if (value < 500000) return 1200;
  if (value < 650000) return 1500;
  if (value < 800000) return 2000;
  if (value < 1000000) return 3000;
  return 4000;
}
