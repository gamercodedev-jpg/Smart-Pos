import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { fetchAndReplaceOrdersFromSupabase } from '@/lib/orderStore';

/**
 * Hook: useKitchenRealtime
 * Subscribes to Postgres INSERT/UPDATE events on public.pos_order_items
 * filtered to `sent_to_kitchen = true` and triggers a re-fetch of grouped
 * tickets by calling `fetchAndReplaceOrdersFromSupabase`.
 */
export default function useKitchenRealtime() {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    // subscribe to all changes where sent_to_kitchen = true (INSERT/UPDATE/DELETE)
    const channel = supabase
      .channel('kitchen-pos-order-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_order_items', filter: 'sent_to_kitchen=eq.true' },
        async (payload) => {
          console.debug('[useKitchenRealtime] postgres payload', payload);
          try {
            await fetchAndReplaceOrdersFromSupabase();
          } catch (e) {
            console.warn('[useKitchenRealtime] refetch failed', e);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        // unsubscribe channel
        // supabase-js v2: channel.unsubscribe()
        if (channel && typeof (channel as any).unsubscribe === 'function') (channel as any).unsubscribe();
        // also try removeChannel if available
        if ((supabase as any).removeChannel) (supabase as any).removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, []);
}
