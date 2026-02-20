import type { PurchaseLot, Recipe, SaleSimulation, StockItem, StockItemId } from '@/types/gaap';
import { computeCostTiers } from '@/lib/gaapCosting';

export function explodeRecipe(recipe: Recipe, qty: number) {
  return recipe.components.map(c => ({ stockItemId: c.stockItemId, qty: c.qty * qty }));
}

export function simulateSale(params: {
  recipe: Recipe;
  qty: number;
  sellingPriceEach: number;
  stockItems: StockItem[];
  purchaseLots: PurchaseLot[];
  branchId: string;
  costMode: 'latest' | 'weightedAvg';
}): SaleSimulation {
  const { recipe, qty, sellingPriceEach, purchaseLots, branchId, costMode } = params;

  const deductions = explodeRecipe(recipe, qty);

  const costBreakdown = deductions.map(d => {
    const lots = purchaseLots.filter(l => l.branchId === branchId && l.stockItemId === d.stockItemId);
    const tiers = computeCostTiers(lots);
    const unitCost = costMode === 'latest' ? tiers.latest : tiers.weightedAvg;
    const lineCost = unitCost * d.qty;
    return { stockItemId: d.stockItemId as StockItemId, qty: d.qty, unitCost, lineCost };
  });

  const totalCogs = costBreakdown.reduce((sum, l) => sum + l.lineCost, 0);
  const totalSales = sellingPriceEach * qty;
  const totalGp = totalSales - totalCogs;
  const gpPercent = totalSales > 0 ? (totalGp / totalSales) * 100 : 0;

  const cogsEach = qty > 0 ? totalCogs / qty : 0;
  const gpEach = sellingPriceEach - cogsEach;

  return {
    menuItemId: recipe.menuItemId,
    qty,
    sellingPriceEach,
    cogsEach,
    gpEach,
    gpPercent,
    deductions,
    costBreakdown,
  };
}
