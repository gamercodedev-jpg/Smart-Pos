import type { CostTiers, PurchaseLot } from '@/types/gaap';

export function computeCostTiers(lots: PurchaseLot[]): CostTiers {
  if (!lots.length) {
    return { lowest: 0, highest: 0, weightedAvg: 0, latest: 0 };
  }

  const unitCosts = lots.map(l => l.unitCost);
  const lowest = Math.min(...unitCosts);
  const highest = Math.max(...unitCosts);

  const totalQty = lots.reduce((sum, l) => sum + l.qty, 0);
  const weightedAvg = totalQty > 0
    ? lots.reduce((sum, l) => sum + l.unitCost * l.qty, 0) / totalQty
    : 0;

  const latestLot = [...lots].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))[0];
  const latest = latestLot?.unitCost ?? weightedAvg;

  return { lowest, highest, weightedAvg, latest };
}

export function money(n: number) {
  return Number.isFinite(n) ? n : 0;
}
