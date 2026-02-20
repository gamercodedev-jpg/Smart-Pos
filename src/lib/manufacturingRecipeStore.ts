import type { Recipe, RecipeIngredient, StockItem, UnitType } from '@/types';
import { recipes as seededRecipes } from '@/data/mockData';
import { getStockItemsSnapshot } from '@/lib/stockStore';
import { getPosMenuItems, upsertPosMenuItem } from '@/lib/posMenuStore';

const STORAGE_KEY = 'mthunzi.manufacturing.recipes.v1';

type Listener = () => void;

let listeners: Listener[] = [];
let state: Recipe[] | null = null;

function emit() {
  for (const l of listeners) l();
}

function persist(next: Recipe[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function seed(): Recipe[] {
  return seededRecipes.map((r) => ({
    ...r,
    ingredients: r.ingredients.map((i) => ({ ...i })),
  }));
}

function load(): Recipe[] {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Recipe[];
      if (Array.isArray(parsed)) {
        state = parsed;
        return state;
      }
    }
  } catch {
    // ignore
  }

  state = seed();
  persist(state);
  return state;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function safeId(prefix: string) {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function recomputeRecipe(recipe: Recipe, stockItems: StockItem[]): Recipe {
  const byId = new Map(stockItems.map((s) => [s.id, s] as const));

  const nextIngredients: RecipeIngredient[] = recipe.ingredients.map((i) => {
    const s = byId.get(i.ingredientId);
    const unitCost = s ? s.currentCost : i.unitCost;
    return {
      ...i,
      ingredientCode: s?.code ?? i.ingredientCode,
      ingredientName: s?.name ?? i.ingredientName,
      unitType: (s?.unitType ?? i.unitType) as UnitType,
      unitCost: round2(Number.isFinite(unitCost) ? unitCost : 0),
      requiredQty: Number.isFinite(i.requiredQty) ? i.requiredQty : 0,
    };
  });

  const totalCost = nextIngredients.reduce((sum, i) => sum + (Number.isFinite(i.requiredQty) ? i.requiredQty : 0) * (Number.isFinite(i.unitCost) ? i.unitCost : 0), 0);
  const outputQty = Number.isFinite(recipe.outputQty) && recipe.outputQty > 0 ? recipe.outputQty : 1;
  const unitCost = totalCost / outputQty;

  return {
    ...recipe,
    ingredients: nextIngredients,
    totalCost: round2(totalCost),
    unitCost: round2(unitCost),
  };
}

function syncRecipeCostToPos(recipe: Recipe) {
  try {
    const items = getPosMenuItems();
    const match = items.find((i) => String(i.code) === String(recipe.parentItemCode));
    if (!match) return;
    if (Math.abs((match.cost ?? 0) - recipe.unitCost) < 0.005) return;
    upsertPosMenuItem({ ...match, cost: recipe.unitCost });
  } catch {
    // ignore
  }
}

export function subscribeManufacturingRecipes(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getManufacturingRecipesSnapshot(): Recipe[] {
  return load();
}

export function getManufacturingRecipeById(recipeId: string): Recipe | undefined {
  return load().find((r) => r.id === recipeId);
}

export function upsertManufacturingRecipe(input: Omit<Recipe, 'id' | 'totalCost' | 'unitCost'> & { id?: string }) {
  const stockItems = getStockItemsSnapshot();

  const base: Recipe = {
    ...(input as Recipe),
    id: input.id && input.id.trim() ? input.id : safeId('recipe'),
    totalCost: 0,
    unitCost: 0,
  };

  const computed = recomputeRecipe(base, stockItems);

  const existing = load();
  const idx = existing.findIndex((r) => r.id === computed.id);
  const next = idx >= 0 ? existing.map((r) => (r.id === computed.id ? computed : r)) : [computed, ...existing];

  state = next;
  persist(next);
  emit();

  syncRecipeCostToPos(computed);
  return computed;
}

export function deleteManufacturingRecipe(recipeId: string) {
  const existing = load();
  const next = existing.filter((r) => r.id !== recipeId);
  state = next;
  persist(next);
  emit();
}

export function resetManufacturingRecipesToSeed() {
  state = seed();
  persist(state);
  emit();
}
