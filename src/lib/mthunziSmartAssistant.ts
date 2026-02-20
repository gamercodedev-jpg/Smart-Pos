import type { POSMenuItem } from '@/types/pos';
import type { Recipe, StockItem, UnitType } from '@/types';

export type PriceRounding = 'none' | '0.5' | '1' | '5';

export function roundTo(n: number, rounding: PriceRounding): number {
  if (!Number.isFinite(n)) return 0;
  if (rounding === 'none') return n;
  const step = rounding === '0.5' ? 0.5 : rounding === '1' ? 1 : 5;
  return Math.round(n / step) * step;
}

export function recommendSellingPrice(params: {
  cogsEach: number;
  targetGpPercent: number;
  rounding?: PriceRounding;
}): { recommended: number; raw: number } {
  const cogs = Math.max(0, Number.isFinite(params.cogsEach) ? params.cogsEach : 0);
  const gp = Math.min(99.9, Math.max(0, Number.isFinite(params.targetGpPercent) ? params.targetGpPercent : 0));
  const denom = 1 - gp / 100;
  const raw = denom > 0 ? cogs / denom : cogs;
  const recommended = roundTo(raw, params.rounding ?? '0.5');
  return { raw, recommended };
}

export function computeMaxProducible(params: {
  recipe: Recipe;
  stockItems: StockItem[];
}): { maxUnits: number; limitingItemId: string | null } {
  const byId = new Map(params.stockItems.map((s) => [s.id, s] as const));
  const outputQty = Number.isFinite(params.recipe.outputQty) && params.recipe.outputQty > 0 ? params.recipe.outputQty : 1;
  const perUnitMultiplier = 1 / outputQty;

  let max = Number.POSITIVE_INFINITY;
  let limiting: string | null = null;

  for (const ing of params.recipe.ingredients ?? []) {
    const requiredPerUnit = (Number.isFinite(ing.requiredQty) ? ing.requiredQty : 0) * perUnitMultiplier;
    if (requiredPerUnit <= 0) continue;

    const onHand = Math.max(0, Number.isFinite(byId.get(ing.ingredientId)?.currentStock) ? byId.get(ing.ingredientId)!.currentStock : 0);
    const possible = onHand / requiredPerUnit;
    if (possible < max) {
      max = possible;
      limiting = ing.ingredientId;
    }
  }

  if (!Number.isFinite(max) || max === Number.POSITIVE_INFINITY) return { maxUnits: 0, limitingItemId: null };
  return { maxUnits: Math.floor(max + 1e-9), limitingItemId: limiting };
}

function normalize(s: string) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYWORD_MAP: Record<string, string[]> = {
  bread: ['flour', 'yeast', 'salt', 'sugar', 'water', 'oil', 'butter', 'margarine'],
  bun: ['flour', 'yeast', 'salt', 'sugar', 'water', 'oil', 'butter', 'margarine'],
  cake: ['flour', 'sugar', 'eggs', 'butter', 'margarine', 'baking powder', 'milk', 'vanilla', 'cocoa'],
  donut: ['flour', 'sugar', 'yeast', 'oil', 'milk', 'eggs'],
  pie: ['flour', 'oil', 'margarine', 'salt'],
  samosa: ['flour', 'oil', 'salt'],
  burger: ['bun', 'bread', 'beef', 'chicken', 'cheese', 'lettuce', 'tomato', 'onion', 'ketchup', 'mayo'],
  fries: ['potato', 'oil', 'salt'],
  chips: ['potato', 'oil', 'salt'],
  tea: ['tea', 'sugar', 'milk'],
  coffee: ['coffee', 'sugar', 'milk'],
  coke: ['coca', 'cola'],
  cola: ['coca', 'cola'],
  water: ['water'],
};

export type SuggestedIngredient = {
  itemId: string;
  confidence: number; // 0..1
  reason: string;
};

export function suggestIngredients(params: {
  menuItem: POSMenuItem;
  stockItems: StockItem[];
  limit?: number;
}): SuggestedIngredient[] {
  const limit = params.limit ?? 10;
  const name = normalize(params.menuItem.name);
  const code = normalize(params.menuItem.code);

  const tokens = new Set<string>([...name.split(' '), ...code.split(' ')].filter(Boolean));
  const boostedTokens = new Set<string>();

  for (const t of tokens) {
    const mapped = KEYWORD_MAP[t];
    if (mapped) for (const m of mapped) boostedTokens.add(m);
  }

  const scored = params.stockItems
    .map((s) => {
      const n = normalize(s.name);
      const c = normalize(s.code);

      let score = 0;
      const reasons: string[] = [];

      for (const t of tokens) {
        if (!t) continue;
        if (n.includes(t) || c.includes(t)) {
          score += 2;
          reasons.push(`matches "${t}"`);
        }
      }
      for (const t of boostedTokens) {
        if (!t) continue;
        if (n.includes(t) || c.includes(t)) {
          score += 3;
          reasons.push(`ingredient keyword "${t}"`);
        }
      }

      return {
        itemId: s.id,
        score,
        reason: reasons.slice(0, 2).join(', ') || 'name similarity',
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      itemId: x.itemId,
      confidence: Math.min(1, x.score / 10),
      reason: x.reason,
    }));

  return scored;
}

export function defaultQtyForUnitType(unitType: UnitType): number {
  switch (unitType) {
    case 'EACH':
      return 1;
    case 'PACK':
      return 1;
    case 'KG':
      return 0.1;
    case 'LTRS':
      return 0.1;
    default:
      return 0;
  }
}
