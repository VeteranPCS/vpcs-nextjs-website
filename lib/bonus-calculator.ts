// lib/bonus-calculator.ts

const BONUS_TIERS = [
  { max: 100000, bonus: 200, charity: 20 },
  { max: 200000, bonus: 400, charity: 40 },
  { max: 300000, bonus: 700, charity: 70 },
  { max: 400000, bonus: 1000, charity: 100 },
  { max: 500000, bonus: 1200, charity: 120 },
  { max: 650000, bonus: 1500, charity: 150 },
  { max: 800000, bonus: 2000, charity: 200 },
  { max: 1000000, bonus: 3000, charity: 300 },
  { max: Infinity, bonus: 4000, charity: 400 },
];

export function calculateBonus(salePrice: number): { bonus: number; charity: number } {
  const tier = BONUS_TIERS.find(t => salePrice < t.max)!;
  return { bonus: tier.bonus, charity: tier.charity };
}

export function calculatePayout(agentCommission: number, commissionSplitPercent: number): number {
  return agentCommission * (commissionSplitPercent / 100);
}
