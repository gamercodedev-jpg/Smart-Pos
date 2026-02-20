import type { StockItemId } from '@/types/gaap';
import { getBalance, applyDeductions } from '@/lib/gaapStore';

export class RecipeIncompleteError extends Error {
  public readonly menuItemId: string;
  public readonly missing: string[];

  constructor(menuItemId: string, missing: string[]) {
    super(`Recipe incomplete for menu item ${menuItemId}`);
    this.name = 'RecipeIncompleteError';
    this.menuItemId = menuItemId;
    this.missing = missing;
  }
}

export class InsufficientStockError extends Error {
  public readonly stockItemId: string;
  public readonly requiredQty: number;
  public readonly onHandQty: number;

  constructor(stockItemId: string, requiredQty: number, onHandQty: number) {
    super(`Insufficient stock for ${stockItemId}`);
    this.name = 'InsufficientStockError';
    this.stockItemId = stockItemId;
    this.requiredQty = requiredQty;
    this.onHandQty = onHandQty;
  }
}

export type RecipeComponentV1 = {
  stockItemId: StockItemId;
  qty: number; // per 1 menu item
};

export type RecipeV1 = {
  menuItemId: string;
  components: RecipeComponentV1[];
};

export type RecipeMapV1 = Record<string, RecipeV1 | undefined>;

export function deepDeduct(params: {
  menuItemId: string;
  qty: number;
  locationId: string;
  recipeMap: RecipeMapV1;
  strict?: boolean; // if true, missing recipe/components throw
}) {
  const { menuItemId, qty, locationId, recipeMap } = params;
  const strict = params.strict ?? true;

  const recipe = recipeMap[menuItemId];
  if (!recipe) {
    if (strict) throw new RecipeIncompleteError(menuItemId, ['RECIPE_NOT_DEFINED']);
    return;
  }

  const missing: string[] = [];
  for (const c of recipe.components) {
    if (!c.stockItemId || !Number.isFinite(c.qty) || c.qty <= 0) {
      missing.push(String(c.stockItemId || 'INVALID_COMPONENT'));
    }
  }
  if (missing.length && strict) {
    throw new RecipeIncompleteError(menuItemId, missing);
  }

  const deductions = recipe.components.map(c => ({
    stockItemId: c.stockItemId,
    qty: c.qty * qty,
  }));

  // Validate inventory before applying
  for (const d of deductions) {
    const onHand = getBalance(locationId, d.stockItemId);
    if (onHand < d.qty) {
      throw new InsufficientStockError(d.stockItemId, d.qty, onHand);
    }
  }

  applyDeductions(locationId, deductions);
}
