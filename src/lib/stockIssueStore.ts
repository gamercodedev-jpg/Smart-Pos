import type { StockIssue } from '@/types';
// no local mock seeding for stock issues; rely on DB-backed data
import { getStockItemById } from '@/lib/stockStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getActiveBrandId, subscribeActiveBrandId } from '@/lib/activeBrand';
import { pushDebug } from '@/lib/debugLog';

const STORAGE_KEY = 'mthunzi.stockIssues.v1';

type StockIssueStateV1 = {
  version: 1;
  issues: StockIssue[];
};

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: StockIssueStateV1 | null = null;
let currentBrandId: string | null = getActiveBrandId();

// Reset cached issues when brand changes
subscribeActiveBrandId(() => {
  currentBrandId = getActiveBrandId();
  cached = null;
  emit();
});

function emit() {
  for (const l of listeners) l();
}

function load(): StockIssueStateV1 {
  if (cached) return cached;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StockIssueStateV1>;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.issues)) {
        cached = { version: 1, issues: parsed.issues as StockIssue[] };
        return cached;
      }
    } catch {
      // ignore
    }
  }

  // Default to empty list (do not seed with mock data). Real data will be loaded from Supabase.
  cached = { version: 1, issues: [] };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cached)); } catch {}
  return cached;
}

// Ensure the remote-backed snapshot is loaded. Returns when initial fetch completes.
export async function ensureStockIssuesLoaded() {
  try {
    if (isSupabaseConfigured() && supabase) {
      const brandId = currentBrandId ?? getActiveBrandId();
      if (!brandId) return;
      await fetchFromDb();
    } else {
      // no supabase configured: keep local snapshot (empty)
      return;
    }
  } catch (e) {
    try { pushDebug('[stockIssueStore] ensureStockIssuesLoaded error: ' + String(e)); } catch {}
  }
}

function save(state: StockIssueStateV1) {
  cached = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function subscribeStockIssues(listener: Listener) {
  listeners.add(listener);
  // lazy init from Supabase on first subscriber
  try {
    if (isSupabaseConfigured() && supabase) {
      // fetch remote rows for current brand
      void fetchFromDb();
    }
  } catch {}
  return () => listeners.delete(listener);
}

export function getStockIssuesSnapshot(): StockIssue[] {
  return load().issues;
}

function nextIssueNo(existing: StockIssue[]) {
  const max = existing.reduce((m, i) => Math.max(m, Number.isFinite(i.issueNo) ? i.issueNo : 0), 0);
  return max > 0 ? max + 1 : 200;
}

async function fetchFromDb() {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const brandId = currentBrandId;
    if (!brandId) return;
    const { data, error } = await supabase.from('stock_issues').select('*').eq('brand_id', brandId).order('created_at', { ascending: false }).limit(500);
    if (error) {
      try { pushDebug('[stockIssueStore] fetchFromDb error: ' + String(error)); } catch {}
      return;
    }
    if (!data) return;
    const rows: StockIssue[] = (data as any[]).map((r) => ({
      id: String(r.id),
      date: String(r.date ?? ''),
      stockItemId: String(r.stock_item_id ?? r.stockItemId ?? ''),
      issueType: String(r.issue_type ?? r.issueType ?? 'Wastage') as any,
      qtyIssued: Number(r.qty_issued ?? r.qtyIssued ?? 0),
      unitCostAtTime: Number(r.unit_cost_at_time ?? r.unitCostAtTime ?? 0),
      totalValueLost: Number(r.total_value_lost ?? r.totalValueLost ?? 0),
      notes: r.notes ?? null,
      createdBy: r.created_by ?? r.createdBy ?? null,
      createdAt: r.created_at ?? r.createdAt ?? undefined,
    }));

    cached = { version: 1, issues: rows };
    emit();
  } catch (e) {
    try { pushDebug('[stockIssueStore] fetchFromDb exception: ' + String(e)); } catch {}
  }
}

export class StockIssueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockIssueError';
  }
}

export async function createStockIssue(params: {
  date: string; // YYYY-MM-DD
  createdBy: string;
  lines: Array<{ stockItemId: string; issueType: StockIssue['issueType']; qtyIssued: number; unitCostAtTime?: number; notes?: string | null }>;
}) {
  const state = load();

  const lines = params.lines
    .map((l) => ({
      stockItemId: l.stockItemId,
      issueType: l.issueType,
      qtyIssued: Number.isFinite(l.qtyIssued) ? l.qtyIssued : 0,
      unitCostAtTime: Number.isFinite(l.unitCostAtTime ?? NaN) ? l.unitCostAtTime : undefined,
      notes: l.notes ?? null,
    }))
    .filter((l) => l.stockItemId && l.qtyIssued > 0);

  if (!lines.length) throw new StockIssueError('Add at least one issue line with quantity.');

  // validate and build createdLines
  const createdLines: StockIssue[] = lines.map((l) => {
    const item = getStockItemById(l.stockItemId);
    if (!item) throw new StockIssueError('Selected stock item not found.');
    if ((l.issueType === 'Theft' || l.issueType === 'Damage') && (!l.notes || !String(l.notes).trim())) {
      throw new StockIssueError('Notes are required for Theft or Damage.');
    }

    const unitCost = typeof l.unitCostAtTime === 'number' ? l.unitCostAtTime : item.currentCost ?? 0;
    const totalValue = round2(l.qtyIssued * unitCost);

    return {
      id: `iss-${crypto.randomUUID()}`,
      date: params.date,
      stockItemId: l.stockItemId,
      issueType: l.issueType,
      qtyIssued: round2(l.qtyIssued),
      unitCostAtTime: round2(unitCost),
      totalValueLost: totalValue,
      notes: l.notes ?? null,
      createdBy: params.createdBy || null,
      createdAt: new Date().toISOString(),
    };
  });

  // Persist via Supabase RPC `process_stock_issue` atomically. Throw on errors (e.g., Low Stock).
  if (isSupabaseConfigured() && supabase) {
    const brandId = currentBrandId ?? getActiveBrandId();
    if (!brandId) throw new StockIssueError('Missing brand id');

    const rpcLines = createdLines.map((cl) => ({
      id: cl.id,
      stock_item_id: cl.stockItemId,
      issue_type: cl.issueType,
      qty_issued: cl.qtyIssued,
      unit_cost_at_time: cl.unitCostAtTime,
      total_value_lost: cl.totalValueLost,
      notes: cl.notes,
    }));

    try {
      const { error } = await supabase.rpc('process_stock_issue', {
        p_brand_id: brandId,
        p_date: params.date,
        p_created_by: params.createdBy,
        p_lines: JSON.stringify(rpcLines),
      });
      if (error) {
        // Reconcile local cache by refetching remote snapshot
        try { await fetchFromDb(); } catch {}
        const msg = String(error.message ?? error.code ?? 'Failed to process stock issue');
        if (msg.includes('Low Stock')) throw new StockIssueError('Low Stock');
        throw new StockIssueError(msg);
      }

      try { await fetchFromDb(); } catch {}
      return { lines: createdLines };
    } catch (e) {
      try { pushDebug('[stockIssueStore] process_stock_issue RPC exception: ' + String(e)); } catch {}
      if (e instanceof StockIssueError) throw e;
      throw new StockIssueError(String((e as Error)?.message ?? 'RPC error'));
    }
  }

  // If Supabase is not configured, persist locally (offline mode)
  save({ ...state, issues: [...createdLines, ...state.issues] });
  return { lines: createdLines };
}

export function deleteStockIssueLine(issueLineId: string) {
  const state = load();
  save({ ...state, issues: state.issues.filter((i) => i.id !== issueLineId) });
}

export function resetStockIssuesToSeed() {
  // Clear to empty (no mock seed)
  save({ version: 1, issues: [] });
}
