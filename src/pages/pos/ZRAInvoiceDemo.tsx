// src/pages/pos/ZRAInvoiceDemo.tsx
import { useMemo, useState, useSyncExternalStore } from 'react';
import ZRAInvoice from '@/components/pos/ZRAInvoice';
import { taxService } from '@/lib/taxService';
import type { InvoiceItem, ZRAInvoiceData } from '@/types/zra';
import { v4 as uuidv4 } from 'uuid';
import { getOrdersSnapshot, subscribeOrders } from '@/lib/orderStore';

function inferCategory(name: string): InvoiceItem['category'] {
    const n = String(name ?? '').toLowerCase();
    if (/(beer|lager|wine|whisky|whiskey|vodka|gin|rum|brandy|cider)/i.test(n)) return 'Alcohol';
    return 'Food';
}

function buildInvoiceFromItems(params: { invoiceId: string; cashierName: string; items: InvoiceItem[] }): ZRAInvoiceData {
    const subtotal = params.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const taxDetails = taxService.calculateTaxes(params.items);
    const total = subtotal + taxDetails.totalTaxes;

    return {
        invoiceId: params.invoiceId,
        zraTpin: '1001234567',
        customerTpin: '1009876543',
        fiscalVerificationCode: uuidv4().toUpperCase(),
        date: new Date().toISOString(),
        items: params.items,
        subtotal,
        taxDetails,
        total,
        cashierName: params.cashierName,
    };
}

const ZRAInvoiceDemo = () => {
    const orders = useSyncExternalStore(subscribeOrders, getOrdersSnapshot, getOrdersSnapshot);
    const paidOrders = useMemo(
        () => orders.filter((o) => o.status === 'paid').slice().sort((a, b) => String(b.paidAt ?? b.createdAt).localeCompare(String(a.paidAt ?? a.createdAt))),
        [orders]
    );

    const [selectedOrderId, setSelectedOrderId] = useState<string>(() => paidOrders[0]?.id ?? '');

    const selectedOrder = useMemo(() => {
        return paidOrders.find((o) => o.id === selectedOrderId) ?? paidOrders[0] ?? null;
    }, [paidOrders, selectedOrderId]);

    const invoiceData = useMemo(() => {
        if (!selectedOrder) {
            const items: InvoiceItem[] = [
                { id: '1', name: 'T-Bone Steak', quantity: 1, unitPrice: 250, category: 'Food' },
                { id: '2', name: 'Mosi Lager', quantity: 2, unitPrice: 35, category: 'Alcohol' },
                { id: '3', name: 'Side Salad', quantity: 1, unitPrice: 45, category: 'Food' },
            ];
            return buildInvoiceFromItems({ invoiceId: `INV-${Date.now()}`, cashierName: 'Cashier', items });
        }

        const items: InvoiceItem[] = (selectedOrder.items ?? [])
            .filter((it) => !it.isVoided)
            .map((it, idx) => ({
                id: String(it.id ?? `${idx + 1}`),
                name: String(it.menuItemName ?? it.menuItemCode ?? it.menuItemId ?? `Item ${idx + 1}`),
                quantity: Number.isFinite(it.quantity) ? it.quantity : 0,
                unitPrice: Number.isFinite(it.unitPrice) ? it.unitPrice : 0,
                category: inferCategory(String(it.menuItemName ?? '')),
            }))
            .filter((i) => i.quantity > 0);

        return buildInvoiceFromItems({
            invoiceId: `INV-${selectedOrder.orderNo ?? selectedOrder.id}`,
            cashierName: selectedOrder.staffName ?? 'Cashier',
            items,
        });
    }, [selectedOrder]);

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                      <h1 className="text-3xl font-bold">ZRA Invoice</h1>
                    <div className="min-w-[240px]">
                        <div className="text-xs text-muted-foreground mb-1">Source order (paid)</div>
                        <select
                            value={selectedOrder?.id ?? ''}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            disabled={paidOrders.length === 0}
                        >
                            {paidOrders.length === 0 ? <option value="">No paid orders yet</option> : null}
                            {paidOrders.map((o) => (
                                <option key={o.id} value={o.id}>
                                    #{o.orderNo ?? o.id} • {o.staffName ?? 'Staff'} • {new Date(o.paidAt ?? o.createdAt).toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {paidOrders.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        Showing sample data. Create a paid order in POS to generate a real ZRA invoice.
                    </div>
                ) : null}

                <ZRAInvoice invoiceData={invoiceData} />
            </div>
        </div>
    );
};

export default ZRAInvoiceDemo;
