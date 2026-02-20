import type { Shift } from '@/types/pos';
import { getOrdersSnapshot, subscribeOrders } from '@/lib/orderStore';

const STORAGE_KEY = 'mthunzi.shift.current.v1';

type Listener = () => void;

let listeners: Listener[] = [];
let state: Shift | null = null;

function emit() {
  for (const l of listeners) l();
}

function persist(next: Shift | null) {
  try {
    if (!next) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function load(): Shift | null {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Shift;
      if (parsed && typeof parsed === 'object') {
        state = parsed;
        return state;
      }
    }
  } catch {
    // ignore
  }

  state = null;
  return state;
}

function nextDrnFrom() {
  const orders = getOrdersSnapshot();
  const max = orders.reduce((m, o) => Math.max(m, o.orderNo ?? 0), 0);
  return max > 0 ? max + 1 : 2000;
}

let ordersUnsub: (() => void) | null = null;
function ensureOrdersWired() {
  if (ordersUnsub) return;
  ordersUnsub = subscribeOrders(() => {
    // If a shift exists with no DRN start (legacy), fill it.
    const cur = load();
    if (cur && cur.isActive && (!cur.drnFrom || cur.drnFrom <= 0)) {
      state = { ...cur, drnFrom: nextDrnFrom() };
      persist(state);
      emit();
    }
  });
}

export function subscribeCurrentShift(listener: Listener) {
  ensureOrdersWired();
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getCurrentShiftSnapshot(): Shift | null {
  ensureOrdersWired();
  return load();
}

export function startShift(params: { staffId: string; staffName: string; startingCash: number; drnFrom?: number }) {
  const now = new Date().toISOString();
  const drnFrom = Number.isFinite(params.drnFrom) && (params.drnFrom ?? 0) > 0 ? (params.drnFrom as number) : nextDrnFrom();

  const next: Shift = {
    id: `shift-${crypto.randomUUID()}`,
    staffId: params.staffId,
    staffName: params.staffName,
    startTime: now,
    endTime: undefined,
    startingCash: Number.isFinite(params.startingCash) ? params.startingCash : 0,
    isActive: true,
    drnFrom,
    drnTo: undefined,
  };

  state = next;
  persist(next);
  emit();
  return next;
}

export function endShift(params: { shiftId: string; drnTo: number }) {
  const cur = load();
  if (!cur) return;
  if (cur.id !== params.shiftId) return;

  const next: Shift = {
    ...cur,
    isActive: false,
    endTime: new Date().toISOString(),
    drnTo: Number.isFinite(params.drnTo) ? params.drnTo : cur.drnTo,
  };

  state = null;
  persist(null);

  // We intentionally clear current shift storage on close.
  // Shift metadata is captured on the cash-up session.
  emit();

  return next;
}

export function clearCurrentShift() {
  state = null;
  persist(null);
  emit();
}
