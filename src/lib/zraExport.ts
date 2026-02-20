import { getOrders } from '@/lib/orderStore';

export type ZraTaxSeasonExportV1 = {
  version: 1;
  generatedAt: string;
  currency: 'ZMW';
  totals: {
    salesGross: number;
    vatAmount: number;
    salesNet: number;
    orderCount: number;
  };
  orders: Array<{
    orderId: string;
    orderNo: number;
    createdAt: string;
    staffName: string;
    tableNo?: number;
    total: number;
    vatAmount: number;
    netSales: number;
    items: Array<{ code: string; name: string; qty: number; unitPrice: number; total: number }>;
  }>;
};

function vatFromInclusiveTotal(total: number, vatRate = 0.16) {
  const vat = total * vatRate / (1 + vatRate);
  const net = total - vat;
  return { vat, net };
}

export function buildZraTaxSeasonExport(): ZraTaxSeasonExportV1 {
  const orders = getOrders();

  const mapped = orders.map(o => {
    const { vat, net } = vatFromInclusiveTotal(o.total);
    return {
      orderId: o.id,
      orderNo: o.orderNo,
      createdAt: o.createdAt,
      staffName: o.staffName,
      tableNo: o.tableNo,
      total: o.total,
      vatAmount: Number(vat.toFixed(2)),
      netSales: Number(net.toFixed(2)),
      items: o.items.map(i => ({
        code: i.menuItemCode,
        name: i.menuItemName,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    };
  });

  const totals = mapped.reduce(
    (acc, o) => {
      acc.salesGross += o.total;
      acc.vatAmount += o.vatAmount;
      acc.salesNet += o.netSales;
      acc.orderCount += 1;
      return acc;
    },
    { salesGross: 0, vatAmount: 0, salesNet: 0, orderCount: 0 }
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    currency: 'ZMW',
    totals: {
      salesGross: Number(totals.salesGross.toFixed(2)),
      vatAmount: Number(totals.vatAmount.toFixed(2)),
      salesNet: Number(totals.salesNet.toFixed(2)),
      orderCount: totals.orderCount,
    },
    orders: mapped,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
