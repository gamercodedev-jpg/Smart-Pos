import type { Order } from '@/types/pos';

const STORAGE_KEY = 'mthunzi.kds.v1';

type Listener = () => void;

export type KitchenItemStatus = 'pending' | 'preparing' | 'ready';

export type KitchenItemState = {
  orderId: string;
  itemId: string;
  status: KitchenItemStatus;
  updatedAt: string;
};

export type KitchenStateV1 = {
  version: 1;
  items: KitchenItemState[];
};

let inMemory: KitchenStateV1 | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function load(): KitchenStateV1 {
  if (inMemory) return inMemory;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as KitchenStateV1;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
        inMemory = {
          version: 1,
          items: parsed.items.filter(Boolean).map((it: any) => ({
            orderId: String(it.orderId ?? ''),
            itemId: String(it.itemId ?? ''),
            status: normalizeStatus(it.status),
            updatedAt: String(it.updatedAt ?? new Date().toISOString()),
          })),
        };
        return inMemory;
      }
    } catch {
      // ignore
    }
  }

  inMemory = { version: 1, items: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemory));
  return inMemory;
}

function save(next: KitchenStateV1) {
  inMemory = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function normalizeStatus(value: unknown): KitchenItemStatus {
  if (value === 'pending' || value === 'preparing' || value === 'ready') return value;
  return 'pending';
}

export function subscribeKitchen(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getKitchenSnapshot(): KitchenStateV1 {
  return load();
}

export function getKitchenItemStatus(orderId: string, itemId: string): KitchenItemStatus {
  const st = load();
  const found = st.items.find((x) => x.orderId === orderId && x.itemId === itemId);
  return found?.status ?? 'pending';
}

export function upsertKitchenItemStatus(params: {
  orderId: string;
  itemId: string;
  status: KitchenItemStatus;
}) {
  const st = load();
  const updatedAt = new Date().toISOString();
  const idx = st.items.findIndex((x) => x.orderId === params.orderId && x.itemId === params.itemId);
  const nextItem: KitchenItemState = {
    orderId: params.orderId,
    itemId: params.itemId,
    status: params.status,
    updatedAt,
  };

  const nextItems = idx >= 0
    ? st.items.map((x, i) => (i === idx ? nextItem : x))
    : [nextItem, ...st.items];

  save({ version: 1, items: nextItems });
}

export function resetKitchen() {
  save({ version: 1, items: [] });
}

export function ensureKitchenItemsFromOrders(orders: Order[]) {
  // Ensures every kitchen item has a persisted status, and prunes items for orders that are finished.
  const activeOrderIds = new Set(
    orders
      .filter((o) => o.status === 'sent' || o.status === 'ready')
      .map((o) => o.id)
  );

  const kitchenItems = orders
    .filter((o) => o.status === 'sent' || o.status === 'ready')
    .flatMap((o) => o.items.filter((it) => it.sentToKitchen && !it.isVoided).map((it) => ({ orderId: o.id, itemId: it.id })));

  const st = load();
  const existingKey = new Set(st.items.map((x) => `${x.orderId}:${x.itemId}`));

  let changed = false;
  let nextItems = st.items;

  // prune
  const pruned = nextItems.filter((x) => activeOrderIds.has(x.orderId));
  if (pruned.length !== nextItems.length) {
    nextItems = pruned;
    changed = true;
  }

  // add missing
  for (const k of kitchenItems) {
    const key = `${k.orderId}:${k.itemId}`;
    if (existingKey.has(key)) continue;
    nextItems = [
      {
        orderId: k.orderId,
        itemId: k.itemId,
        status: 'pending' as const,
        updatedAt: new Date().toISOString(),
      },
      ...nextItems,
    ];
    changed = true;
  }

  if (changed) save({ version: 1, items: nextItems });
}

export function clearKitchenForOrder(orderId: string) {
  const st = load();
  const next = st.items.filter((x) => x.orderId !== orderId);
  if (next.length === st.items.length) return;
  save({ version: 1, items: next });
}
