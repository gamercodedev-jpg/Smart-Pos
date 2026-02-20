import type { GaapStateV1, LocationId, PurchaseLot, StockItemId, StockTransfer, TransferLine } from '@/types/gaap';
import { initialBalances, purchaseLots } from '@/data/gaapMockData';

const STORAGE_KEY = 'mthunzi.gaap.state.v1';

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function getGaapState(): GaapStateV1 {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as GaapStateV1;
    } catch {
      // ignore
    }
  }
  const state: GaapStateV1 = {
    version: 1,
    balances: initialBalances,
    purchaseLots: purchaseLots as PurchaseLot[],
    transfers: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function saveGaapState(state: GaapStateV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getBalance(locationId: LocationId, stockItemId: StockItemId): number {
  const state = getGaapState();
  return state.balances[locationId]?.[stockItemId] ?? 0;
}

export function applyDeductions(locationId: LocationId, deductions: Array<{ stockItemId: StockItemId; qty: number }>) {
  const state = getGaapState();
  const current = state.balances[locationId] ?? {};

  const next: Record<StockItemId, number> = { ...current };
  for (const d of deductions) {
    next[d.stockItemId] = (next[d.stockItemId] ?? 0) - d.qty;
  }

  const nextState: GaapStateV1 = {
    ...state,
    balances: {
      ...state.balances,
      [locationId]: next,
    },
  };

  saveGaapState(nextState);
  return nextState;
}

export function createTransfer(params: {
  fromLocationId: LocationId;
  toLocationId: LocationId;
  lines: TransferLine[];
}): StockTransfer {
  const state = getGaapState();
  const transfer: StockTransfer = {
    id: newId('xfer'),
    fromLocationId: params.fromLocationId,
    toLocationId: params.toLocationId,
    createdAt: new Date().toISOString(),
    status: 'issued',
    lines: params.lines,
    issuedAt: new Date().toISOString(),
  };

  // Apply issue: from decreases immediately (issued)
  const fromBal = { ...(state.balances[params.fromLocationId] ?? {}) };
  for (const line of params.lines) {
    fromBal[line.stockItemId] = (fromBal[line.stockItemId] ?? 0) - line.qty;
  }

  const nextState: GaapStateV1 = {
    ...state,
    balances: {
      ...state.balances,
      [params.fromLocationId]: fromBal,
    },
    transfers: [transfer, ...state.transfers],
  };

  saveGaapState(nextState);
  return transfer;
}

export function receiveTransfer(transferId: string): { ok: true; transfer: StockTransfer } | { ok: false; error: string } {
  const state = getGaapState();
  const transfer = state.transfers.find(t => t.id === transferId);
  if (!transfer) return { ok: false, error: 'Transfer not found' };
  if (transfer.status === 'received') return { ok: false, error: 'Transfer already received' };

  const toBal = { ...(state.balances[transfer.toLocationId] ?? {}) };
  for (const line of transfer.lines) {
    toBal[line.stockItemId] = (toBal[line.stockItemId] ?? 0) + line.qty;
  }

  const updated: StockTransfer = {
    ...transfer,
    status: 'received',
    receivedAt: new Date().toISOString(),
  };

  const nextState: GaapStateV1 = {
    ...state,
    balances: {
      ...state.balances,
      [transfer.toLocationId]: toBal,
    },
    transfers: state.transfers.map(t => (t.id === transferId ? updated : t)),
  };

  saveGaapState(nextState);
  return { ok: true, transfer: updated };
}

export type TransferQrPayloadV1 = {
  v: 1;
  type: 'stock-transfer';
  transferId: string;
  issuedAt: string;
};

export function buildTransferQrPayload(transfer: StockTransfer): TransferQrPayloadV1 {
  return { v: 1, type: 'stock-transfer', transferId: transfer.id, issuedAt: transfer.issuedAt ?? transfer.createdAt };
}
