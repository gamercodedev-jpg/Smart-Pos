import type { BatchProduction, Recipe } from '@/types';
import { batchProductions as seededBatches } from '@/data/mockData';
import { getManufacturingRecipeById } from '@/lib/manufacturingRecipeStore';
import { applyBatchProductionToStock, revertBatchProductionFromStock } from '@/lib/stockStore';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const STORAGE_KEY = 'mthunzi.manufacturing.batches.v1';

type Listener = () => void;

let listeners: Listener[] = [];
let state: BatchProduction[] | null = null;

function emit() {
  for (const l of listeners) l();
}

function persist(next: BatchProduction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function seed(): BatchProduction[] {
  return seededBatches.map((b) => ({
    ...b,
    ingredientsUsed: b.ingredientsUsed.map((i) => ({ ...i })),
  }));
}

function load(): BatchProduction[] {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BatchProduction[];
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

export class BatchInsufficientStockError extends Error {
  public readonly items: Array<{ itemId: string; requiredQty: number; onHandQty: number }>;

  constructor(items: Array<{ itemId: string; requiredQty: number; onHandQty: number }>) {
    super('Insufficient stock for batch production');
    this.name = 'BatchInsufficientStockError';
    this.items = items;
  }
}

function computeBatchFromRecipe(params: {
  recipe: Recipe;
  batchDate: string;
  theoreticalOutput: number;
  actualOutput: number;
  producedBy: string;
}): BatchProduction {
  const { recipe, batchDate, theoreticalOutput, actualOutput, producedBy } = params;

  const outputQty = recipe.outputQty > 0 ? recipe.outputQty : 1;
  const multiplier = actualOutput / outputQty;

  const ingredientsUsed = recipe.ingredients.map((i) => ({
    ...i,
    requiredQty: round2(i.requiredQty * multiplier),
  }));

  const totalCost = round2(recipe.totalCost * multiplier);
  const unitCost = actualOutput > 0 ? round2(totalCost / actualOutput) : 0;

  const yieldVariance = round2(actualOutput - theoreticalOutput);
  const yieldVariancePercent = theoreticalOutput > 0 ? round2((yieldVariance / theoreticalOutput) * 100) : 0;

  return {
    id: safeId('batch'),
    recipeId: recipe.id,
    recipeName: recipe.parentItemName,
    batchDate,
    theoreticalOutput,
    actualOutput,
    yieldVariance,
    yieldVariancePercent,
    ingredientsUsed,
    totalCost,
    unitCost,
    producedBy,
  };
}

export function subscribeBatchProductions(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getBatchProductionsSnapshot(): BatchProduction[] {
  return load();
}

export function recordBatchProduction(params: {
  recipeId: string;
  batchDate: string;
  theoreticalOutput: number;
  actualOutput: number;
  producedBy: string;
}) {
  const recipe = getManufacturingRecipeById(params.recipeId);
  if (!recipe) throw new Error('Recipe not found');

  const nextBatch = computeBatchFromRecipe({
    recipe,
    batchDate: params.batchDate,
    theoreticalOutput: params.theoreticalOutput,
    actualOutput: params.actualOutput,
    producedBy: params.producedBy,
  });

  const stockResult = applyBatchProductionToStock({ recipe, batch: nextBatch });
  if (stockResult.ok !== true) {
    if ('insufficient' in stockResult) {
      throw new BatchInsufficientStockError(stockResult.insufficient);
    }
    throw new BatchInsufficientStockError([]);
  }

  const existing = load();
  const next = [nextBatch, ...existing];
  state = next;
  persist(next);
  emit();

  try {
    void logSensitiveAction({
      userId: `user:${params.producedBy}`,
      userName: params.producedBy,
      actionType: 'batch_production_record',
      reference: nextBatch.id,
      newValue: nextBatch.actualOutput,
      notes: `${nextBatch.recipeName} • Output ${nextBatch.actualOutput} (theoretical ${nextBatch.theoreticalOutput}) • variance ${nextBatch.yieldVariance} (${nextBatch.yieldVariancePercent}%)`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  return nextBatch;
}

export function deleteBatchProduction(batchId: string) {
  const existing = load();
  const toDelete = existing.find((b) => b.id === batchId) ?? null;
  if (!toDelete) return;

  const recipe = getManufacturingRecipeById(toDelete.recipeId);
  if (!recipe) throw new Error('Cannot delete batch: recipe not found.');

  const revert = revertBatchProductionFromStock({ recipe, batch: toDelete });
  if (revert.ok !== true) {
    const first = revert.insufficientFinishedGoods[0];
    throw new Error(
      first
        ? `Cannot delete batch: finished goods already used (need ${first.requiredQty}, on hand ${first.onHandQty}).`
        : 'Cannot delete batch: finished goods already used.'
    );
  }

  const next = existing.filter((b) => b.id !== batchId);
  state = next;
  persist(next);
  emit();

  try {
    void logSensitiveAction({
      userId: `user:${toDelete.producedBy}`,
      userName: toDelete.producedBy,
      actionType: 'batch_production_delete',
      reference: toDelete.id,
      previousValue: toDelete.actualOutput,
      notes: `${toDelete.recipeName} batch deleted • ${toDelete.batchDate}`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }
}

export function resetBatchProductionsToSeed() {
  state = seed();
  persist(state);
  emit();
}
