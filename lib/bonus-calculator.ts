// lib/bonus-calculator.ts

const BONUS_TIERS = [
  { max: 150000, bonus: 250, charity: 100 },
  { max: 250000, bonus: 500, charity: 150 },
  { max: 350000, bonus: 1000, charity: 200 },
  { max: 500000, bonus: 1500, charity: 250 },
  { max: 750000, bonus: 2500, charity: 350 },
  { max: 1000000, bonus: 3500, charity: 400 },
  { max: Infinity, bonus: 4000, charity: 500 },
];

export function calculateBonus(salePrice: number): { bonus: number; charity: number } {
  const tier = BONUS_TIERS.find(t => salePrice < t.max)!;
  return { bonus: tier.bonus, charity: tier.charity };
}

export function calculatePayout(agentCommission: number, commissionSplitPercent: number): number {
  return agentCommission * (commissionSplitPercent / 100);
}
