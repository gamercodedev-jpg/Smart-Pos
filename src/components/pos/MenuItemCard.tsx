import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { POSMenuItem } from '@/types/pos';
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase, SUPABASE_BUCKET } from '@/lib/supabaseClient';

type Props = {
  item: POSMenuItem;
  onAdd: (item: POSMenuItem) => void;
  className?: string;
};

export default function MenuItemCard({ item, onAdd, className }: Props) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);

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
        'group relative overflow-hidden cursor-pointer bg-muted/30 hover:ring-2 hover:ring-primary transition-all active:scale-[0.99] aspect-[4/3]',
        className
      )}
      onClick={() => onAdd(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
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
              <span className="text-[11px] text-white/80">Tap to add</span>
              <span className="text-sm font-bold text-white">K {item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
