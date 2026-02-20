import type { DepartmentId, StockItem, StockTakeSession, StockVariance } from '@/types';
import { applyStockTakeAdjustments, getStockItemsSnapshot } from '@/lib/stockStore';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const STORAGE_KEY = 'mthunzi.stockTakes.v1';

type StockTakeStateV1 = {
  version: 1;
  sessions: StockTakeSession[];
};

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: StockTakeStateV1 | null = null;

function emit() {
  for (const l of listeners) l();
}

function load(): StockTakeStateV1 {
  if (cached) return cached;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StockTakeStateV1>;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.sessions)) {
        cached = { version: 1, sessions: parsed.sessions as StockTakeSession[] };
        return cached;
      }
    } catch {
      // ignore
    }
  }

  cached = { version: 1, sessions: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
}

function save(state: StockTakeStateV1) {
  cached = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

export function subscribeStockTakes(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStockTakesSnapshot(): StockTakeSession[] {
  return load().sessions;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function recordStockTake(params: {
  date: string; // YYYY-MM-DD
  departmentId?: DepartmentId | 'all';
  physicalCounts: Record<string, number>; // itemId -> physicalQty
  createdBy?: string;
  applyAdjustmentsToStock?: boolean;
}): StockTakeSession {
  const stockItems = getStockItemsSnapshot();
  const byId = new Map(stockItems.map((s) => [s.id, s] as const));

  const variances: StockVariance[] = [];
  const adjustments: Array<{ itemId: string; newQty: number }> = [];

  for (const [itemId, physicalQtyRaw] of Object.entries(params.physicalCounts)) {
    const item = byId.get(itemId);
    if (!item) continue;

    if (params.departmentId && params.departmentId !== 'all' && item.departmentId !== params.departmentId) continue;

    const physicalQty = Number.isFinite(physicalQtyRaw) ? physicalQtyRaw : NaN;
    if (!Number.isFinite(physicalQty)) continue;

    const systemQty = Number.isFinite(item.currentStock) ? item.currentStock : 0;
    const unitCost = Number.isFinite(item.currentCost) ? item.currentCost : 0;

    const varianceQty = round2(physicalQty - systemQty);
    const varianceValue = round2(varianceQty * unitCost);

    variances.push(toVariance(item, {
      systemQty,
      physicalQty,
      varianceQty,
      varianceValue,
      countDate: params.date,
    }));

    adjustments.push({ itemId, newQty: physicalQty });
  }

  // Apply adjustments so system matches the physical count (optional but default true).
  if (params.applyAdjustmentsToStock ?? true) {
    applyStockTakeAdjustments(adjustments);
  }

  const now = new Date().toISOString();
  const session: StockTakeSession = {
    id: `st-${crypto.randomUUID()}`,
    date: params.date,
    departmentId: params.departmentId ?? 'all',
    createdAt: now,
    createdBy: params.createdBy ?? 'System',
    variances,
  };

  const state = load();
  save({ ...state, sessions: [session, ...state.sessions] });

  try {
    const totalVarianceValue = round2(variances.reduce((sum, v) => sum + (Number.isFinite(v.varianceValue) ? v.varianceValue : 0), 0));
    const withVariance = variances.filter((v) => Number.isFinite(v.varianceQty) && v.varianceQty !== 0).length;

    void logSensitiveAction({
      userId: `user:${session.createdBy}`,
      userName: session.createdBy,
      actionType: 'stock_take_record',
      reference: session.id,
      newValue: withVariance,
      notes: `Stock take ${session.date} • Dept ${session.departmentId} • ${variances.length} counted • ${withVariance} variances • value K ${totalVarianceValue.toFixed(2)}`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  return session;
}

function toVariance(item: StockItem, computed: {
  systemQty: number;
  physicalQty: number;
  varianceQty: number;
  varianceValue: number;
  countDate: string;
}): StockVariance {
  return {
    id: `var-${crypto.randomUUID()}`,
    itemId: item.id,
    itemCode: item.code,
    itemName: item.name,
    departmentId: item.departmentId,
    unitType: item.unitType,
    lowestCost: item.lowestCost,
    highestCost: item.highestCost,
    currentCost: item.currentCost,
    systemQty: computed.systemQty,
    physicalQty: computed.physicalQty,
    varianceQty: computed.varianceQty,
    varianceValue: computed.varianceValue,
    countDate: computed.countDate,
    timesHadVariance: 1,
  };
}

export function deleteStockTake(sessionId: string) {
  const state = load();
  const toDelete = state.sessions.find((s) => s.id === sessionId) ?? null;
  save({ ...state, sessions: state.sessions.filter((s) => s.id !== sessionId) });

  try {
    if (toDelete) {
      void logSensitiveAction({
        userId: `user:${toDelete.createdBy}`,
        userName: toDelete.createdBy,
        actionType: 'stock_take_delete',
        reference: toDelete.id,
        notes: `Stock take deleted • ${toDelete.date} • Dept ${toDelete.departmentId}`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function resetStockTakes() {
  save({ version: 1, sessions: [] });
}
