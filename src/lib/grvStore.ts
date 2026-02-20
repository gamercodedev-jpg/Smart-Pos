import type { GRV, GRVItem } from '@/types';
import { grvs as seededGrvs, suppliers } from '@/data/mockData';
import { applyGRVReceiptToStock } from '@/lib/stockStore';
import { getStockItemById } from '@/lib/stockStore';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const STORAGE_KEY = 'mthunzi.grvs.v1';

type Listener = () => void;

let listeners: Listener[] = [];
let state: GRV[] | null = null;

const VALID_STATUSES: Array<GRV['status']> = ['pending', 'confirmed', 'cancelled'];
const VALID_PAYMENT_TYPES: Array<GRV['paymentType']> = ['cash', 'account', 'cheque'];

function emit() {
  for (const l of listeners) l();
}

function persist(next: GRV[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function normalizeStatus(value: unknown): GRV['status'] {
  return VALID_STATUSES.includes(value as GRV['status']) ? (value as GRV['status']) : 'pending';
}

function normalizePaymentType(value: unknown): GRV['paymentType'] {
  return VALID_PAYMENT_TYPES.includes(value as GRV['paymentType']) ? (value as GRV['paymentType']) : 'account';
}

function normalizeItem(raw: any): GRVItem {
  const quantity = Number.isFinite(raw?.quantity) ? Number(raw.quantity) : 0;
  const unitCost = Number.isFinite(raw?.unitCost) ? Number(raw.unitCost) : 0;
  return {
    id: String(raw?.id ?? `grv-item-${crypto.randomUUID()}`),
    itemId: String(raw?.itemId ?? ''),
    itemCode: String(raw?.itemCode ?? ''),
    itemName: String(raw?.itemName ?? ''),
    quantity,
    unitCost,
    totalCost: round2(quantity * unitCost),
  };
}

function normalizeGRV(raw: any): GRV {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [];

  const subtotal = Number.isFinite(raw?.subtotal) ? Number(raw.subtotal) : computeTotals(items, { applyVat: true }).subtotal;
  const tax = Number.isFinite(raw?.tax) ? Number(raw.tax) : computeTotals(items, { applyVat: true }).tax;
  const total = Number.isFinite(raw?.total) ? Number(raw.total) : computeTotals(items, { applyVat: true }).total;

  return {
    id: String(raw?.id ?? `grv-${crypto.randomUUID()}`),
    grvNo: String(raw?.grvNo ?? 'GRV-000'),
    date: String(raw?.date ?? new Date().toISOString().slice(0, 10)),
    supplierId: String(raw?.supplierId ?? ''),
    supplierName: String(raw?.supplierName ?? 'Supplier'),
    items,
    subtotal,
    tax,
    total,
    paymentType: normalizePaymentType(raw?.paymentType),
    status: normalizeStatus(raw?.status),
    receivedBy: String(raw?.receivedBy ?? 'System'),
  };
}

function seed(): GRV[] {
  return [...seededGrvs].map((g: any) => normalizeGRV(g));
}

function load(): GRV[] {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        state = parsed.map(normalizeGRV);
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

function nextGrvNumber(existing: GRV[]) {
  const nums = existing
    .map(g => {
      const m = g.grvNo.match(/GRV-(\d+)/i);
      return m ? Number(m[1]) : 0;
    })
    .filter(n => Number.isFinite(n));

  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `GRV-${String(next).padStart(3, '0')}`;
}

function computeTotals(items: GRVItem[], opts?: { vatRate?: number; applyVat?: boolean }) {
  const vatRate = opts?.vatRate ?? 0.16;
  const applyVat = opts?.applyVat ?? true;

  const subtotal = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unitCost), 0));
  const tax = applyVat ? round2(subtotal * vatRate) : 0;
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function subscribeGRVs(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getGRVsSnapshot(): GRV[] {
  return load();
}

export function getDefaultPurchaseContext() {
  const supplier = suppliers[0];
  return {
    supplierId: supplier?.id ?? '',
    supplierName: supplier?.name ?? 'Supplier',
    paymentType: 'account' as const,
    receivedBy: 'System',
  };
}

export function createDraftGRV(params: {
  date: string;
  supplierId: string;
  supplierName: string;
  paymentType: GRV['paymentType'];
  receivedBy: string;
  items?: GRVItem[];
  applyVat?: boolean;
  vatRate?: number;
}): GRV {
  const existing = load();
  const grvNo = nextGrvNumber(existing);
  const items = params.items ?? [];
  const totals = computeTotals(items, { applyVat: params.applyVat, vatRate: params.vatRate });

  const created: GRV = {
    id: `grv-${crypto.randomUUID()}`,
    grvNo,
    date: params.date,
    supplierId: params.supplierId,
    supplierName: params.supplierName,
    items,
    ...totals,
    paymentType: params.paymentType,
    status: 'pending',
    receivedBy: params.receivedBy,
  };

  const next: GRV[] = [created, ...existing].map(normalizeGRV);
  state = next;
  persist(next);
  emit();

  try {
    void logSensitiveAction({
      userId: `user:${params.receivedBy}`,
      userName: params.receivedBy,
      actionType: 'grv_create',
      reference: created.id,
      newValue: created.total,
      notes: `${created.grvNo} • ${created.supplierName} • ${created.paymentType}`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  return created;
}

export function updateGRV(grvId: string, patch: Partial<Omit<GRV, 'id' | 'grvNo'>>) {
  const existing = load();
  const before = existing.find((g) => g.id === grvId) ?? null;
  const next: GRV[] = existing.map(g => {
    if (g.id !== grvId) return g;
    if (g.status !== 'pending') return g; // lock once confirmed/cancelled

    const merged: GRV = { ...g, ...patch } as GRV;
    const normalizedItems = (merged.items ?? []).map(recomputeLine);

    const hasExplicitTotals =
      typeof (patch as any).subtotal === 'number' ||
      typeof (patch as any).tax === 'number' ||
      typeof (patch as any).total === 'number';

    const totals = hasExplicitTotals
      ? {
          subtotal: merged.subtotal,
          tax: merged.tax,
          total: merged.total,
        }
      : computeTotals(normalizedItems, { applyVat: true });

    return { ...merged, items: normalizedItems, ...totals };
  }).map(normalizeGRV);

  state = next;
  persist(next);
  emit();

  try {
    const after = next.find((g) => g.id === grvId) ?? null;
    if (before && after) {
      void logSensitiveAction({
        userId: `user:${after.receivedBy}`,
        userName: after.receivedBy,
        actionType: 'grv_update',
        reference: after.id,
        previousValue: before.total,
        newValue: after.total,
        notes: `${after.grvNo} updated • ${after.supplierName}`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function deleteGRV(grvId: string) {
  const existing = load();
  const toDelete = existing.find((g) => g.id === grvId) ?? null;
  const next: GRV[] = existing.filter(g => g.id !== grvId).map(normalizeGRV);
  state = next;
  persist(next);
  emit();

  try {
    if (toDelete) {
      void logSensitiveAction({
        userId: `user:${toDelete.receivedBy}`,
        userName: toDelete.receivedBy,
        actionType: 'grv_delete',
        reference: toDelete.id,
        previousValue: toDelete.total,
        notes: `${toDelete.grvNo} deleted • ${toDelete.supplierName}`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function confirmGRV(grvId: string) {
  const existing = load();
  let toApply: GRV | null = null;
  const next: GRV[] = existing.map(g => {
    if (g.id !== grvId) return g;
    if (g.status !== 'pending') return g;
    toApply = g;
    return { ...g, status: 'confirmed' };
  }).map(normalizeGRV);

  state = next;
  persist(next);
  emit();

  if (toApply) {
    try {
      void logSensitiveAction({
        userId: `user:${toApply.receivedBy}`,
        userName: toApply.receivedBy,
        actionType: 'grv_confirm',
        reference: toApply.id,
        newValue: toApply.total,
        notes: `${toApply.grvNo} confirmed • Stock received into inventory`,
        captureGeo: false,
      });
    } catch {
      // ignore
    }

    applyGRVReceiptToStock({
      items: toApply.items.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
      costMode: 'weightedAverage',
    });
  }
}

export function cancelGRV(grvId: string) {
  const existing = load();
  const before = existing.find((g) => g.id === grvId) ?? null;
  const next: GRV[] = existing.map(g => {
    if (g.id !== grvId) return g;
    if (g.status !== 'pending') return g;
    return { ...g, status: 'cancelled' };
  }).map(normalizeGRV);

  state = next;
  persist(next);
  emit();

  try {
    if (before) {
      void logSensitiveAction({
        userId: `user:${before.receivedBy}`,
        userName: before.receivedBy,
        actionType: 'grv_cancel',
        reference: before.id,
        previousValue: before.total,
        notes: `${before.grvNo} cancelled • ${before.supplierName}`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore
  }
}

export function makeGRVItemFromStockItem(stockItemId: string): GRVItem | null {
  const si = getStockItemById(stockItemId);
  if (!si) return null;

  return {
    id: `grv-item-${crypto.randomUUID()}`,
    itemId: si.id,
    itemCode: si.code,
    itemName: si.name,
    quantity: 1,
    unitCost: si.currentCost,
    totalCost: round2(1 * si.currentCost),
  };
}

export function recomputeLine(item: GRVItem): GRVItem {
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
  const unitCost = Number.isFinite(item.unitCost) ? item.unitCost : 0;
  return { ...item, totalCost: round2(quantity * unitCost) };
}
