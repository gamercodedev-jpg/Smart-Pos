import type { StockIssue } from '@/types';
import { stockIssues as seededStockIssues } from '@/data/mockData';
import { getStockItemById, applyInternalTransfers } from '@/lib/stockStore';

const STORAGE_KEY = 'mthunzi.stockIssues.v1';

type StockIssueStateV1 = {
  version: 1;
  issues: StockIssue[];
};

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: StockIssueStateV1 | null = null;

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

  // Seed with mock issues so the UI isn't empty, but new issues are real.
  cached = { version: 1, issues: Array.isArray(seededStockIssues) ? [...seededStockIssues] : [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
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
  return () => listeners.delete(listener);
}

export function getStockIssuesSnapshot(): StockIssue[] {
  return load().issues;
}

function nextIssueNo(existing: StockIssue[]) {
  const max = existing.reduce((m, i) => Math.max(m, Number.isFinite(i.issueNo) ? i.issueNo : 0), 0);
  return max > 0 ? max + 1 : 200;
}

export class StockIssueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockIssueError';
  }
}

export function createStockIssue(params: {
  date: string; // YYYY-MM-DD
  createdBy: string;
  lines: Array<{ originItemId: string; destinationItemId: string; qty: number }>;
}) {
  const state = load();
  const issueNo = nextIssueNo(state.issues);

  const lines = params.lines
    .map((l) => ({
      originItemId: l.originItemId,
      destinationItemId: l.destinationItemId,
      qty: Number.isFinite(l.qty) ? l.qty : 0,
    }))
    .filter((l) => l.originItemId && l.destinationItemId && l.qty > 0);

  if (!lines.length) throw new StockIssueError('Add at least one issue line with quantity.');

  for (const l of lines) {
    if (l.originItemId === l.destinationItemId) {
      throw new StockIssueError('Origin and destination cannot be the same item.');
    }
    const origin = getStockItemById(l.originItemId);
    const dest = getStockItemById(l.destinationItemId);
    if (!origin || !dest) throw new StockIssueError('Selected stock item not found.');
    if (origin.unitType !== dest.unitType) {
      throw new StockIssueError(`Unit mismatch: ${origin.unitType} → ${dest.unitType}. Choose matching units.`);
    }
    if (l.qty > (origin.currentStock ?? 0) + 1e-9) {
      throw new StockIssueError(`Insufficient stock for ${origin.code} - ${origin.name}.`);
    }
  }

  const applied = applyInternalTransfers(
    lines.map((l) => ({ fromItemId: l.originItemId, toItemId: l.destinationItemId, qty: l.qty }))
  );

  if (!applied.ok) {
    throw new StockIssueError('Insufficient stock for one or more lines.');
  }

  const createdLines: StockIssue[] = lines.map((l, idx) => {
    const origin = getStockItemById(l.originItemId)!;
    const dest = getStockItemById(l.destinationItemId)!;

    const beforeAfter = applied.results[idx];
    const unitCost = beforeAfter.unitCost;
    const value = round2(-1 * l.qty * unitCost);

    return {
      id: `iss-${crypto.randomUUID()}`,
      issueNo,
      date: params.date,
      originItemId: l.originItemId,
      destinationItemId: l.destinationItemId,
      originItemCode: origin.code,
      destinationItemCode: dest.code,
      wasQty: beforeAfter.fromBefore,
      issuedQty: round2(l.qty),
      nowQty: beforeAfter.fromAfter,
      value,
      createdBy: params.createdBy,
    };
  });

  save({ ...state, issues: [...createdLines, ...state.issues] });
  return { issueNo, lines: createdLines };
}

export function deleteStockIssueLine(issueLineId: string) {
  const state = load();
  save({ ...state, issues: state.issues.filter((i) => i.id !== issueLineId) });
}

export function resetStockIssuesToSeed() {
  save({ version: 1, issues: Array.isArray(seededStockIssues) ? [...seededStockIssues] : [] });
}
