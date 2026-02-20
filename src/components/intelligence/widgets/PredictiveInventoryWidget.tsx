import { useMemo, useState } from 'react';
import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { computePredictiveInventory } from '@/lib/predictiveInventory';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function nextSaturdayLocal() {
  const d = new Date();
  const dow = d.getDay();
  const delta = (6 - dow + 7) % 7;
  d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
  return dateKeyLocal(d);
}

export function PredictiveInventoryWidget(props: { intel: UseIntelligenceReturn }) {
  const { formatMoney } = useCurrency();
  const [targetDate, setTargetDate] = useState<string>(() => nextSaturdayLocal());

  const result = useMemo(() => {
    return computePredictiveInventory({
      orders: props.intel.allOrders,
      stockItems: props.intel.stockItems,
      recipes: props.intel.recipes,
      posMenuItems: props.intel.pos.items,
      config: { targetDate, lookbackDays: 90 },
    });
  }, [props.intel.allOrders, props.intel.stockItems, props.intel.recipes, props.intel.pos.items, targetDate]);

  const topRisks = result.risks
    .filter((r) => r.shortageUnits > 0)
    .slice()
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
    .slice(0, 7);

  const buyList = result.buyList
    .filter((b) => b.shortage > 0)
    .slice()
    .sort((a, b) => b.shortage - a.shortage)
    .slice(0, 7);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">Forecast date</div>
        <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-8 w-[160px]" />
        {result.isPaydayWeekend ? <Badge variant="secondary">Payday weekend</Badge> : null}
        <div className="ml-auto text-xs text-muted-foreground">{result.weekday}</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1">
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">At-risk menu items</div>
          {topRisks.length ? (
            <div className="space-y-2">
              {topRisks.map((r) => (
                <div key={r.menuItemCode} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.menuItemName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Forecast {r.forecastQty} • Max {r.maxProducible} • Short {r.shortageUnits}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-destructive whitespace-nowrap">{formatMoney(r.revenueAtRisk)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No shortages detected.</div>
          )}
        </div>

        <div className="rounded-md border p-3">
          <div className="text-sm font-medium mb-2">Buy list (top)</div>
          {buyList.length ? (
            <div className="space-y-2">
              {buyList.map((b) => (
                <div key={b.ingredientId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{b.ingredientName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Short {b.shortage} {b.unitType} • On hand {b.onHand}
                    </div>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">{b.usedBy.length} items</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No buy list items.</div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">This widget uses weekday seasonality + recent trend to forecast demand.</div>
    </div>
  );
}
