import Dexie, { type Table } from 'dexie';
import type { Order } from '@/types/pos';

type QueuedOrder = {
  id: string; // same as Order.id
  createdAt: string;
  order: Order;
};

class OfflineQueueDb extends Dexie {
  orders!: Table<QueuedOrder, string>;

  constructor() {
    super('pmx_offline_queue');
    this.version(1).stores({
      orders: 'id, createdAt',
    });
  }
}

const db = new OfflineQueueDb();

export const enqueueOrder = async (order: Order) => {
  await db.orders.put({
    id: order.id,
    createdAt: new Date().toISOString(),
    order,
  });
};

export const listQueuedOrders = async () => {
  return db.orders.orderBy('createdAt').reverse().toArray();
};

export const deleteQueuedOrder = async (id: string) => {
  await db.orders.delete(id);
};

export const flushQueuedOrders = async (send: (order: Order) => Promise<void>) => {
  const queued = await listQueuedOrders();
  for (const item of queued) {
    await send(item.order);
    await deleteQueuedOrder(item.id);
  }
};
