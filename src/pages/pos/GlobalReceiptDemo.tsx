import { useMemo, useState, useSyncExternalStore } from 'react';
import GlobalReceiptGenerator from '@/components/pos/GlobalReceiptGenerator';
import { calculateTotalWithTaxes } from '@/lib/taxEngine';
import { getReceiptSettings } from '@/lib/receiptSettingsService';
import { getOrdersSnapshot, subscribeOrders } from '@/lib/orderStore';
import type { ReceiptData } from '@/types';

export default function GlobalReceiptDemo() {
  const settings = getReceiptSettings();

  const orders = useSyncExternalStore(subscribeOrders, getOrdersSnapshot, getOrdersSnapshot);
  const paidOrders = useMemo(
    () => orders.filter((o) => o.status === 'paid').slice().sort((a, b) => String(b.paidAt ?? b.createdAt).localeCompare(String(a.paidAt ?? a.createdAt))),
    [orders]
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => paidOrders[0]?.id ?? '');
  const selectedOrder = useMemo(() => paidOrders.find((o) => o.id === selectedOrderId) ?? paidOrders[0] ?? null, [paidOrders, selectedOrderId]);
  const subtotal = useMemo(() => {
    if (!selectedOrder) return 1000;
    const s = Number.isFinite(selectedOrder.subtotal) ? selectedOrder.subtotal : 0;
    return s > 0 ? s : 1000;
  }, [selectedOrder]);

  const taxResult = useMemo(() => calculateTotalWithTaxes(subtotal, settings.countryCode as any), [subtotal, settings.countryCode]);

  const receipt: Omit<ReceiptData, 'usdEquivalent' | 'legalFooter'> = {
    receiptId: selectedOrder ? `R-${selectedOrder.orderNo ?? selectedOrder.id}` : `R-${Date.now()}`,
    issuedAt: new Date().toISOString(),
    countryCode: settings.countryCode,
    currencyCode: settings.currencyCode,
    subtotal,
    taxes: taxResult.taxBreakdown.map((t) => ({ name: t.name, amount: t.amount })),
    total: taxResult.total,

    // Zambia: if you have a real ZRA verification URL, set it here.
    zraVerificationUrl:
      settings.countryCode === 'ZM'
        ? `https://example.zra.org.zm/verify?receipt=${encodeURIComponent(`R-${Date.now()}`)}`
        : undefined,

    // Non-Zambia fallback: a digital receipt URL.
    qrUrl:
      settings.countryCode !== 'ZM' && settings.digitalReceiptBaseUrl
        ? `${settings.digitalReceiptBaseUrl}${encodeURIComponent(`R-${Date.now()}`)}`
        : undefined,
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Global Receipt Generator</h1>
            <p className="text-sm text-muted-foreground">
              Uses live FX for USD equivalent, settings-driven legal footer, and smart QR behavior.
            </p>
          </div>
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
            Showing sample data. Create a paid order in POS to generate a real receipt.
          </div>
        ) : null}

        <GlobalReceiptGenerator receipt={receipt} settings={settings} />
      </div>
    </div>
  );
}
