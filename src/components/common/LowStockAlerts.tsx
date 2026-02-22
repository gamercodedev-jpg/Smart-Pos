import React, { useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Bell } from 'lucide-react';
import { subscribeStockItems, getStockItemsSnapshot } from '@/lib/stockStore';
import { subscribeManufacturingRecipes, getManufacturingRecipesSnapshot } from '@/lib/manufacturingRecipeStore';
import { useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/badge';

export default function LowStockAlerts() {
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);
  const recipes = useSyncExternalStore(subscribeManufacturingRecipes, getManufacturingRecipesSnapshot);

  const low = useMemo(() => {
    const map = new Map<string, { id: string; name: string; onHand: number; required: number; products: Set<string> }>();
    if (!recipes || !recipes.length) return [] as Array<any>;

    for (const r of recipes) {
      const outputQty = r.outputQty && r.outputQty > 0 ? r.outputQty : 1;
      for (const ing of r.ingredients ?? []) {
        const requiredPerUnit = (Number(ing.requiredQty) || 0) / outputQty;
        if (!requiredPerUnit || requiredPerUnit <= 0) continue;
        const stock = stockItems.find((s) => s.id === ing.ingredientId);
        const onHand = Number(stock?.currentStock ?? 0);
        if (onHand < requiredPerUnit) {
          const existing = map.get(ing.ingredientId) ?? { id: ing.ingredientId, name: ing.ingredientName || ing.ingredientCode || ing.ingredientId, onHand, required: 0, products: new Set<string>() };
          existing.onHand = onHand;
          existing.required = Math.max(existing.required, requiredPerUnit);
          existing.products.add(r.parentItemName || String(r.parentItemCode || r.parentItemId));
          map.set(ing.ingredientId, existing);
        }
      }
    }

    return Array.from(map.values()).map((v) => ({ ...v, products: Array.from(v.products) }));
  }, [recipes, stockItems]);

  const count = low.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted/50" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {count > 0 ? <span className="absolute top-0 right-0 h-3 w-3 bg-destructive rounded-full border border-white/10 text-[10px] flex items-center justify-center text-white">{count}</span> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span className="font-medium">Low Stock Alerts</span>
            {count > 0 ? <Badge variant="destructive">{count}</Badge> : <Badge>None</Badge>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <DropdownMenuItem className="text-sm text-muted-foreground">No low stock items</DropdownMenuItem>
        ) : (
          low.map((l) => (
            <DropdownMenuItem key={l.id} className="flex flex-col items-start gap-1 py-2">
              <div className="w-full flex items-center justify-between">
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.onHand.toFixed(2)}</div>
              </div>
              <div className="text-xs text-muted-foreground">Needs ≥ {Number(l.required).toFixed(2)} — Affects: {l.products.slice(0,3).join(', ')}</div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { window.location.href = '/inventory/stock-items'; }} className="text-sm">Open inventory</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
