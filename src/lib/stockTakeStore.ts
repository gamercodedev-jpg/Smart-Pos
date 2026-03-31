import type { DepartmentId, StockItem, StockTakeSession, StockVariance } from '@/types';
import { applyStockTakeAdjustments, getStockItemsSnapshot, refreshStockItems } from '@/lib/stockStore';
import { getReceiptSettingsSnapshot } from '@/lib/receiptSettingsService';
import { logSensitiveAction } from '@/lib/systemAuditLog';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getActiveBrandId } from '@/lib/activeBrand';

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

export async function fetchStockTakesFromDb(options?: { from?: string; to?: string }): Promise<StockTakeSession[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const brandId = getActiveBrandId();
  if (!brandId) return [];

  let query = supabase
    .from('stock_takes')
    .select('*')
    .eq('brand_id', brandId)
    .order('date', { ascending: false });

  if (options?.from) query = query.gte('date', options.from);
  if (options?.to) query = query.lte('date', options.to);

  const { data: takes, error: takeErr } = await query;
  if (takeErr || !takes) {
    console.warn('Failed to fetch stock takes from DB', takeErr);
    return [];
  }

  const allStockItems = getStockItemsSnapshot();
  const stockItemMap = new Map(allStockItems.map((item) => [item.id, item]));

  const sessions: StockTakeSession[] = [];

  for (const take of takes) {
    const { data: vars, error: varErr } = await supabase
      .from('stock_take_items')
      .select('*')
      .eq('stock_take_id', take.id);

    if (varErr) {
      console.warn('Failed to fetch stock take items for take', take.id, varErr);
      continue;
    }

    const variances: StockVariance[] = (vars || []).map((item: any) => {
      const stockItem = stockItemMap.get(item.stock_item_id);
      return {
        id: item.id,
        itemId: item.stock_item_id,
        itemCode: stockItem?.code ?? '',
        itemName: stockItem?.name ?? '',
        departmentId: (stockItem?.departmentId ?? 'groceries') as DepartmentId,
        unitType: stockItem?.unitType ?? 'EACH',
        lowestCost: stockItem?.lowestCost ?? 0,
        highestCost: stockItem?.highestCost ?? 0,
        currentCost: stockItem?.currentCost ?? 0,
        systemQty: Number(item.system_qty ?? 0),
        physicalQty: Number(item.counted_qty ?? 0),
        varianceQty: Number(item.variance ?? 0),
        varianceValue: Number(item.total_value ?? 0),
        countDate: take.date,
        timesHadVariance: 1,
      };
    });

    sessions.push({
      id: take.id,
      date: take.date,
      departmentId: (take.department_id as DepartmentId) ?? 'all',
      createdAt: take.created_at ?? '',
      createdBy: take.created_by ?? 'System',
      variances,
    });
  }

  return sessions;
}

export async function refreshStockTakesFromDb(options?: { from?: string; to?: string }): Promise<StockTakeSession[]> {
  const sessions = await fetchStockTakesFromDb(options);
  save({ version: 1, sessions });
  return sessions;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function recordStockTake(params: {
  date: string; // YYYY-MM-DD
  departmentId?: DepartmentId | 'all';
  physicalCounts: Record<string, number>; // itemId -> physicalQty
  createdBy?: string;
  applyAdjustmentsToStock?: boolean;
}): Promise<StockTakeSession> {
  const stockItems = getStockItemsSnapshot();
  const byId = new Map(stockItems.map((s) => [s.id, s] as const));

  const variances: StockVariance[] = [];
  const adjustments: Array<{ itemId: string; newQty: number }> = [];
  const rpcItems: any[] = [];

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

    rpcItems.push({ stockItemId: item.id, systemQty, countedQty: physicalQty, unitCost, totalValue: varianceValue });
  }

  // Always persist stock take and variances to Supabase
  let session: StockTakeSession;
  const now = new Date().toISOString();
  let stockTakeId = crypto.randomUUID();
  const brandId = getActiveBrandId();

  if (isSupabaseConfigured() && supabase && brandId) {
    // Insert stock take (new schema)
    try {
      const takeNo = `TAKE-${Math.floor(Math.random() * 1000000)}`;
      const totalVariance = variances.reduce((sum, v) => sum + (Number.isFinite(v.varianceValue) ? v.varianceValue : 0), 0);
      const { data: takeData, error: takeErr } = await supabase.from('stock_takes').insert([
        {
          id: stockTakeId,
          brand_id: brandId,
          take_no: takeNo,
          date: params.date,
          created_by: null, // Set to null or a valid user uuid if available
          status: 'pending',
          notes: null,
          total_variance: totalVariance,
          created_at: now,
          updated_at: now,
        },
      ]);
      if (takeErr) {
        console.error('Failed to insert stock take', takeErr);
        throw new Error('Unable to save stock take. Please try again.');
      }
    } catch (err) {
      console.error('Error inserting stock take', err);
      throw err;
    }

    // Insert variances to stock_take_items as well as stock_variances
    try {
      if (Array.isArray(variances) && variances.length > 0) {
        const stockTakeItemRows = variances.map((v) => ({
          id: crypto.randomUUID(),
          stock_take_id: stockTakeId,
          stock_item_id: v.itemId,
          system_qty: v.systemQty,
          counted_qty: v.physicalQty,
          variance: v.varianceQty,
          unit_cost: v.currentCost,
          total_value: v.varianceValue,
        }));
        const { error: itemErr } = await supabase.from('stock_take_items').insert(stockTakeItemRows);
        if (itemErr) {
          throw itemErr;
        }

        const varianceRows = variances.map((v) => ({
          brand_id: brandId,
          item_name: v.itemName,
          variance_qty: v.varianceQty,
          variance_value: v.varianceValue,
          count_date: v.countDate,
        }));
        const { error: varianceErr } = await supabase.from('stock_variances').insert(varianceRows);
        if (varianceErr) {
          throw varianceErr;
        }
      }
    } catch (err) {
      console.error('Failed to insert stock take item/variance data into DB', err);
      throw new Error('Unable to save stock take line items. Please try again.');
    }
  }

  if (params.applyAdjustmentsToStock ?? true) {
    applyStockTakeAdjustments(adjustments);
  }

  session = {
    id: stockTakeId,
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
    const receipt = getReceiptSettingsSnapshot();
    const code = (receipt && (receipt.currencyCode ?? 'ZMW')) || 'ZMW';

    void logSensitiveAction({
      userId: `user:${session.createdBy}`,
      userName: session.createdBy,
      actionType: 'stock_take_record',
      reference: session.id,
      newValue: withVariance,
      notes: `Stock take ${session.date} • Dept ${session.departmentId} • ${variances.length} counted • ${withVariance} variances • value ${code} ${totalVarianceValue.toFixed(2)}`,
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
