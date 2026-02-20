import { useEffect } from 'react';
import { flushQueuedOrders } from '@/lib/offlineOrderQueue';
import { toast } from '@/components/ui/use-toast';
import type { Order } from '@/types/pos';

async function fakeServerSend(_order: Order) {
  // Placeholder for real API call.
  await new Promise((r) => setTimeout(r, 150));
}

export function useOfflineOrderSync() {
  useEffect(() => {
    let cancelled = false;

    const tryFlush = async () => {
      if (cancelled) return;
      if (typeof navigator === 'undefined' || !navigator.onLine) return;

      try {
        await flushQueuedOrders(fakeServerSend);
      } catch {
        // swallow; we'll retry on next online event
      }
    };

    const onOnline = () => {
      tryFlush().then(() => {
        toast({ title: 'Back online', description: 'Syncing queued orders…' });
      });
    };

    window.addEventListener('online', onOnline);
    tryFlush();

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);
}
