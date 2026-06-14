let totalTokens = 0;

export function recordSpend(usage: { totalTokens?: number } | undefined): void {
  totalTokens += usage?.totalTokens ?? 0;
}

export function spendSoFar(): number {
  return totalTokens;
}
