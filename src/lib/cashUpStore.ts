import type { CashUpSession, PaymentMethod } from '@/types/pos';
import type { Order } from '@/types/pos';

const STORAGE_KEY = 'mthunzi.cashups.v1';

type Listener = () => void;

export type PayoutLine = {
  id: string;
  reason: string;
  amount: number;
};

export type CashUpRecord = CashUpSession & {
  payoutLines?: PayoutLine[];
};

type StateV1 = {
  version: 1;
  sessions: CashUpRecord[];
};

let listeners: Listener[] = [];
let state: StateV1 | null = null;

function emit() {
  for (const l of listeners) l();
}

function persist(next: StateV1) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function load(): StateV1 {
  if (state) return state;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StateV1;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.sessions)) {
        state = parsed;
        return state;
      }
    }
  } catch {
    // ignore
  }

  state = { version: 1, sessions: [] };
  persist(state);
  return state;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function subscribeCashUps(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getCashUpsSnapshot(): CashUpRecord[] {
  return load().sessions;
}

function addToBucket(buckets: Record<PaymentMethod, number>, method: PaymentMethod, amount: number) {
  buckets[method] = round2((buckets[method] ?? 0) + (Number.isFinite(amount) ? amount : 0));
}

export function computeSalesFromOrders(params: { orders: Order[]; drnFrom: number; drnTo: number }) {
  const paid = params.orders.filter(
    (o) => o.status === 'paid' && (o.orderNo ?? 0) >= params.drnFrom && (o.orderNo ?? 0) <= params.drnTo
  );

  const buckets: Record<PaymentMethod, number> = {
    cash: 0,
    card: 0,
    cheque: 0,
    account: 0,
    non_bank: 0,
  };

  for (const o of paid) {
    if (o.splitPayments && o.splitPayments.length) {
      for (const sp of o.splitPayments) {
        addToBucket(buckets, sp.method, sp.amount);
      }
      continue;
    }

    const method: PaymentMethod = (o.paymentMethod ?? 'cash') as PaymentMethod;
    addToBucket(buckets, method, o.total);
  }

  const totalSales = round2(Object.values(buckets).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0));

  return {
    paidOrders: paid,
    totalSales,
    cashSales: buckets.cash,
    cardSales: buckets.card,
    chequeSales: buckets.cheque,
    accountSales: buckets.account,
    nonBankSales: buckets.non_bank,
    cashReceived: buckets.cash,
  };
}

export function saveCashUp(record: CashUpRecord) {
  const s = load();
  const idx = s.sessions.findIndex((x) => x.id === record.id);
  const nextSessions = idx >= 0
    ? s.sessions.map((x) => (x.id === record.id ? record : x))
    : [record, ...s.sessions];

  state = { ...s, sessions: nextSessions };
  persist(state);
  emit();
}

export function createCashUp(params: {
  shiftId: string;
  staffId: string;
  staffName: string;
  date: string;
  drnFrom: number;
  drnTo: number;
  openingCash: number;
  tips: number;
  payouts: PayoutLine[];
  actualCash: number;
  sales: ReturnType<typeof computeSalesFromOrders>;
  status?: CashUpSession['status'];
}) {
  const totalPayouts = round2(params.payouts.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0));

  const expectedCash = round2(params.openingCash + params.sales.cashReceived - totalPayouts);
  const shortageOverage = round2(params.actualCash - expectedCash);
  const bankableCash = round2(params.actualCash - (Number.isFinite(params.tips) ? params.tips : 0));

  const record: CashUpRecord = {
    id: `cu-${crypto.randomUUID()}`,
    shiftId: params.shiftId,
    staffId: params.staffId,
    staffName: params.staffName,
    date: params.date,
    drnFrom: params.drnFrom,
    drnTo: params.drnTo,

    totalSales: params.sales.totalSales,
    cashSales: params.sales.cashSales,
    cardSales: params.sales.cardSales,
    chequeSales: params.sales.chequeSales,
    accountSales: params.sales.accountSales,
    nonBankSales: params.sales.nonBankSales,

    openingCash: round2(params.openingCash),
    cashReceived: params.sales.cashReceived,
    payouts: totalPayouts,
    tips: round2(params.tips),

    expectedCash,
    actualCash: round2(params.actualCash),
    shortageOverage,
    bankableCash,

    status: params.status ?? 'submitted',
    payoutLines: params.payouts.map((p) => ({ ...p })),
  };

  saveCashUp(record);
  return record;
}

export function deleteCashUp(id: string) {
  const s = load();
  state = { ...s, sessions: s.sessions.filter((x) => x.id !== id) };
  persist(state);
  emit();
}

export function resetCashUps() {
  state = { version: 1, sessions: [] };
  persist(state);
  emit();
}
