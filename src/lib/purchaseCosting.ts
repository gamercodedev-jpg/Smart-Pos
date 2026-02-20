export type CostTiers = {
  lowest: number;
  highest: number;
  weightedAvg: number;
  latest: number;
};

export type PurchaseLotLike = {
  receivedAt: string;
  qty: number;
  unitCost: number;
};

function money(n: number) {
  return Number.isFinite(n) ? n : 0;
}

export function computeCostTiersFromPurchases(lots: PurchaseLotLike[]): CostTiers {
  if (!lots.length) return { lowest: 0, highest: 0, weightedAvg: 0, latest: 0 };

  const unitCosts = lots.map((l) => money(l.unitCost));
  const lowest = Math.min(...unitCosts);
  const highest = Math.max(...unitCosts);

  const totalQty = lots.reduce((sum, l) => sum + money(l.qty), 0);
  const weightedAvg = totalQty > 0
    ? lots.reduce((sum, l) => sum + money(l.unitCost) * money(l.qty), 0) / totalQty
    : 0;

  const latestLot = [...lots].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))[0];
  const latest = latestLot ? money(latestLot.unitCost) : weightedAvg;

  return { lowest, highest, weightedAvg, latest };
}
