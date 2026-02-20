import type { Order, OrderItem } from '@/types/pos';

export type CleanOrdersOptions = {
  includeStatuses?: Array<Order['status']>;
};

function normalizeSearchText(s: string) {
  return s.trim().toLowerCase();
}

function looksLikeNoise(text: string) {
  const t = normalizeSearchText(text);
  if (!t) return false;
  return (
    t.includes('test') ||
    t.includes('demo') ||
    t.includes('error') ||
    t.includes('void') ||
    t.includes('sample')
  );
}

export function cleanOrderItems(items: OrderItem[] | undefined | null): OrderItem[] {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((it) => it && typeof it === 'object')
    .filter((it) => !it.isVoided)
    .filter((it) => {
      if (looksLikeNoise(it.menuItemName ?? '')) return false;
      if (looksLikeNoise(it.menuItemCode ?? '')) return false;
      return true;
    })
    .map((it) => ({ ...it }));
}

export function cleanOrdersForIntelligence(orders: Order[], options?: CleanOrdersOptions): Order[] {
  const includeStatuses = options?.includeStatuses ?? ['paid'];

  return (orders ?? [])
    .filter((o) => o && typeof o === 'object')
    .filter((o) => includeStatuses.includes(o.status))
    .filter((o) => {
      if (looksLikeNoise(o.staffName ?? '')) return false;
      if (looksLikeNoise(o.customerName ?? '')) return false;
      return true;
    })
    .filter((o) => Number.isFinite(o.total) && o.total > 0)
    .map((o) => {
      const items = cleanOrderItems(o.items);
      return { ...o, items };
    })
    .filter((o) => (o.items?.length ?? 0) > 0);
}
