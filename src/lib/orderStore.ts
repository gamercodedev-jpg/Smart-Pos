import type { Order, OrderItem, OrderType, PaymentMethod } from '@/types/pos';
import { enqueueOrder } from '@/lib/offlineOrderQueue';
import { flushQueuedOrders } from '@/lib/offlineOrderQueue';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const STORAGE_KEY = 'mthunzi.orders.v1';

export type StoredOrdersV1 = {
  version: 1;
  orders: Order[];
};

function load(): StoredOrdersV1 {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StoredOrdersV1;
    } catch {
      // ignore
    }
  }
  const init: StoredOrdersV1 = { version: 1, orders: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
  return init;
}

function save(state: StoredOrdersV1) {
  inMemoryState = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

type Listener = () => void;
const listeners = new Set<Listener>();
let inMemoryState: StoredOrdersV1 | null = null;

function emit() {
  for (const l of listeners) l();
}

function getState(): StoredOrdersV1 {
  if (!inMemoryState) inMemoryState = load();
  return inMemoryState;
}

const useRemote = isSupabaseConfigured() && supabase;
let flushWired = false;

async function sendOrderToSupabase(order: Order) {
  if (!useRemote) return;
  const client = supabase!.schema('erp');

  const { error: orderErr } = await client.from('pos_orders').upsert({
    id: order.id,
    order_no: order.orderNo,
    table_no: order.tableNo ?? null,
    order_type: order.orderType,
    status: order.status,
    staff_id: order.staffId,
    staff_name: order.staffName,
    subtotal: order.subtotal,
    discount_amount: order.discountAmount ?? 0,
    discount_percent: order.discountPercent ?? 0,
    tax: order.tax,
    total: order.total,
    total_cost: order.totalCost,
    gross_profit: order.grossProfit,
    gp_percent: order.gpPercent,
    payment_method: order.paymentMethod ?? null,
    created_at: order.createdAt,
    sent_at: order.sentAt ?? null,
    paid_at: order.paidAt ?? null,
  });
  if (orderErr) throw orderErr;

  // Replace order items (simple & reliable)
  await client.from('pos_order_items').delete().eq('order_id', order.id);
  const { error: itemsErr } = await client.from('pos_order_items').insert(
    order.items.map((it) => ({
      order_id: order.id,
      menu_item_id: it.menuItemId,
      menu_item_code: it.menuItemCode,
      menu_item_name: it.menuItemName,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      unit_cost: it.unitCost,
      discount_percent: it.discountPercent ?? null,
      total: it.total,
      notes: it.notes ?? null,
      modifiers: it.modifiers ?? null,
      is_voided: it.isVoided,
      void_reason: it.voidReason ?? null,
      sent_to_kitchen: it.sentToKitchen,
      created_at: order.createdAt,
    }))
  );
  if (itemsErr) throw itemsErr;
}

async function flushQueueIfPossible() {
  if (!useRemote) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  await flushQueuedOrders(sendOrderToSupabase);
}

function ensureFlushWired() {
  if (flushWired || typeof window === 'undefined') return;
  flushWired = true;
  window.addEventListener('online', () => {
    void flushQueueIfPossible();
  });
  // Attempt one flush on startup
  void flushQueueIfPossible();
}

function nextOrderNo(existing: Order[]) {
  const max = existing.reduce((m, o) => Math.max(m, o.orderNo ?? 0), 0);
  return max > 0 ? max + 1 : 2000;
}

export function getOrders(): Order[] {
  return getState().orders;
}

export function getOrdersSnapshot(): Order[] {
  return getState().orders;
}

export function subscribeOrders(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function upsertOrder(order: Order) {
  const state = getState();
  const idx = state.orders.findIndex(o => o.id === order.id);
  const next = idx >= 0
    ? state.orders.map(o => (o.id === order.id ? order : o))
    : [order, ...state.orders];
  save({ ...state, orders: next });

  try {
    ensureFlushWired();
    if (!useRemote) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(order);
      return;
    }
    void sendOrderToSupabase(order).catch(() => enqueueOrder(order));
  } catch {
    // ignore
  }
}

export function addOrder(params: {
  staffId: string;
  staffName: string;
  orderType: OrderType;
  tableNo?: number | null;
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  tax: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  gpPercent: number;
  status: Order['status'];
  paymentMethod?: PaymentMethod;
}): Order {
  const state = getState();
  const now = new Date().toISOString();
  const order: Order = {
    id: `ord-${Date.now()}`,
    orderNo: nextOrderNo(state.orders),
    tableId: params.tableNo ? `t${params.tableNo}` : undefined,
    tableNo: params.tableNo ?? undefined,
    orderType: params.orderType,
    status: params.status,
    staffId: params.staffId,
    staffName: params.staffName,
    items: params.items,
    subtotal: params.subtotal,
    discountAmount: params.discountAmount ?? 0,
    discountPercent: params.discountPercent ?? 0,
    tax: params.tax,
    total: params.total,
    totalCost: params.totalCost,
    grossProfit: params.grossProfit,
    gpPercent: params.gpPercent,
    createdAt: now,
    sentAt: params.status === 'sent' ? now : undefined,
    paidAt: params.status === 'paid' ? now : undefined,
    paymentMethod: params.paymentMethod,
  };

  save({ ...state, orders: [order, ...state.orders] });

  try {
    const actionType =
      order.status === 'paid'
        ? ('order_paid' as const)
        : order.status === 'sent'
          ? ('order_sent' as const)
          : order.status === 'ready'
            ? ('order_ready' as const)
            : order.status === 'served'
              ? ('order_served' as const)
              : null;

    if (actionType) {
      void logSensitiveAction({
        userId: params.staffId,
        userName: params.staffName,
        actionType,
        reference: order.id,
        newValue: order.total,
        notes: `Order #${order.orderNo}${order.tableNo ? ` (Table ${order.tableNo})` : ''} • ${order.orderType} • ${order.paymentMethod ?? 'unpaid'}`,
        captureGeo: false,
      });
    }
  } catch {
    // ignore audit failures
  }

  // Offline-first: if the device is offline, queue for sync.
  try {
    ensureFlushWired();
    if (!useRemote) return order;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(order);
      return order;
    }

    void sendOrderToSupabase(order).catch(() => enqueueOrder(order));
  } catch {
    // ignore
  }

  return order;
}

export function markOrderSent(orderId: string) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  const updated: Order = { ...order, status: 'sent', sentAt: new Date().toISOString() };
  save({ ...state, orders: state.orders.map(o => (o.id === orderId ? updated : o)) });

  try {
    void logSensitiveAction({
      userId: updated.staffId,
      userName: updated.staffName,
      actionType: 'order_sent',
      reference: updated.id,
      newValue: updated.status,
      notes: `Order #${updated.orderNo} sent to kitchen`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  try {
    ensureFlushWired();
    if (!useRemote) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(updated);
      return;
    }
    void sendOrderToSupabase(updated).catch(() => enqueueOrder(updated));
  } catch {
    // ignore
  }
}

export function markOrderReady(orderId: string) {
  const state = getState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;
  const now = new Date().toISOString();
  const updated: Order = {
    ...order,
    status: 'ready',
    items: order.items.map(it => ({ ...it, preparedAt: it.preparedAt ?? now })),
  };
  save({ ...state, orders: state.orders.map(o => (o.id === orderId ? updated : o)) });

  try {
    void logSensitiveAction({
      userId: updated.staffId,
      userName: updated.staffName,
      actionType: 'order_ready',
      reference: updated.id,
      newValue: updated.status,
      notes: `Order #${updated.orderNo} marked ready`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  try {
    ensureFlushWired();
    if (!useRemote) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(updated);
      return;
    }
    void sendOrderToSupabase(updated).catch(() => enqueueOrder(updated));
  } catch {
    // ignore
  }
}

export function markOrderServed(orderId: string) {
  const state = getState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;

  const updated: Order = { ...order, status: 'served' };
  save({ ...state, orders: state.orders.map((o) => (o.id === orderId ? updated : o)) });

  try {
    void logSensitiveAction({
      userId: updated.staffId,
      userName: updated.staffName,
      actionType: 'order_served',
      reference: updated.id,
      newValue: updated.status,
      notes: `Order #${updated.orderNo} served`,
      captureGeo: false,
    });
  } catch {
    // ignore
  }

  try {
    ensureFlushWired();
    if (!useRemote) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(updated);
      return;
    }
    void sendOrderToSupabase(updated).catch(() => enqueueOrder(updated));
  } catch {
    // ignore
  }
}

export function markOrderItemPrepared(params: { orderId: string; itemId: string; prepared: boolean }) {
  const state = getState();
  const order = state.orders.find((o) => o.id === params.orderId);
  if (!order) return;

  const now = new Date().toISOString();
  const updated: Order = {
    ...order,
    items: order.items.map((it) => {
      if (it.id !== params.itemId) return it;
      return { ...it, preparedAt: params.prepared ? (it.preparedAt ?? now) : undefined };
    }),
  };

  save({ ...state, orders: state.orders.map((o) => (o.id === params.orderId ? updated : o)) });

  try {
    ensureFlushWired();
    if (!useRemote) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      void enqueueOrder(updated);
      return;
    }
    void sendOrderToSupabase(updated).catch(() => enqueueOrder(updated));
  } catch {
    // ignore
  }
}

export function clearOrders() {
  save({ version: 1, orders: [] });
}
