import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { POSMenuItem } from '@/types/pos';
import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { isSupabaseConfigured, supabase, SUPABASE_BUCKET } from '@/lib/supabaseClient';
import { subscribeStockItems, getStockItemsSnapshot } from '@/lib/stockStore';
import { subscribeManufacturingRecipes, getManufacturingRecipesSnapshot } from '@/lib/manufacturingRecipeStore';

type Props = {
  item: POSMenuItem;
  onAdd: (item: POSMenuItem) => void;
  className?: string;
};

export default function MenuItemCard({ item, onAdd, className }: Props) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);
  const recipes = useSyncExternalStore(subscribeManufacturingRecipes, getManufacturingRecipesSnapshot);

  const lowStock = useMemo(() => {
    try {
      if (!recipes || !recipes.length) return false;
      const recipe = recipes.find((r) => String(r.parentItemCode) === String(item.code) || String(r.parentItemId) === String(item.id));
      if (!recipe) return false;
      const outputQty = recipe.outputQty && recipe.outputQty > 0 ? recipe.outputQty : 1;
      for (const ing of recipe.ingredients ?? []) {
        const requiredPerUnit = (Number(ing.requiredQty) || 0) / outputQty;
        const stock = stockItems.find((s) => s.id === ing.ingredientId);
        const onHand = Number(stock?.currentStock ?? 0);
        if (onHand < requiredPerUnit) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [recipes, stockItems, item.code, item.id]);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      try {
        const img = (item as any).image;
        if (!img) {
          if (mounted) setImgSrc(undefined);
          return;
        }
        if (typeof img === 'string' && img.startsWith('http')) {
          if (mounted) setImgSrc(img);
          return;
        }
        if (isSupabaseConfigured() && supabase && typeof img === 'string') {
          try {
            const path = img.replace(/^\/+/, '');
            const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
            const pub = (data as any)?.publicUrl ?? undefined;
            if (mounted) setImgSrc(pub);
            return;
          } catch (e) {
            // fallthrough to undefined
          }
        }
      } catch {
        // ignore
      }
      if (mounted) setImgSrc(undefined);
    };
    void resolve();
    return () => { mounted = false; };
  }, [item]);
  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-muted/30 hover:ring-2 hover:ring-primary transition-all active:scale-[0.99] aspect-[4/3]',
        className,
        lowStock ? 'opacity-85' : 'cursor-pointer'
      )}
      onClick={() => {
        if (!lowStock) onAdd(item);
      }}
      role="button"
      tabIndex={0}
      aria-disabled={lowStock}
      onKeyDown={(e) => {
        if (lowStock) return;
        if (e.key === 'Enter' || e.key === ' ') onAdd(item);
      }}
    >
      <CardContent className="p-0 h-full">
        <div className="absolute inset-0">
          <img
            src={imgSrc ?? '/menu/placeholder-burger.svg'}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/menu/placeholder-burger.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        </div>

        <div className="relative h-full p-3 flex flex-col justify-between">
          <div className="flex items-start justify-end">
            <div className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/90">
              {item.code}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold leading-snug text-white line-clamp-2">{item.name}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-[11px] text-white/80">{lowStock ? 'Low stock' : 'Tap to add'}</span>
              <span className="text-sm font-bold text-white">K {item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
      {lowStock ? (
        <div className="absolute top-2 left-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Low Stock</div>
      ) : null}
    </Card>
  );
}
