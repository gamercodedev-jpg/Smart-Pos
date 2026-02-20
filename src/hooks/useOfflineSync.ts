// src/hooks/useOfflineSync.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useEffect, useState } from 'react';

export const useOfflineSync = () => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingTransactions = useLiveQuery(() => db.syncQueue.where('status').equals('pending').toArray(), []);

  useEffect(() => {
    const syncData = async () => {
      if (isOnline && pendingTransactions && pendingTransactions.length > 0 && !isSyncing) {
        setIsSyncing(true);
        
        for (const tx of pendingTransactions) {
          try {
            // Mark as syncing
            await db.syncQueue.update(tx.id!, { status: 'syncing' });

            // Simple conflict resolution: last write wins.
            // A more robust strategy could involve checking a 'last_updated' timestamp from the server.
            const response = await fetch(tx.url, {
              method: tx.method,
              headers: {
                'Content-Type': 'application/json',
                // Add auth headers if needed
              },
              body: JSON.stringify({
                ...tx.payload,
                client_timestamp: tx.timestamp, // Send client timestamp for server-side checks
              }),
            });

            if (response.ok) {
              // If successful, remove from queue
              await db.syncQueue.delete(tx.id!);
            } else if (response.status === 409) { // Conflict
                console.warn(`Conflict detected for transaction ${tx.id}. Server version is newer.`);
                // Here you could implement logic to fetch the latest version and merge,
                // or simply discard the local change. For now, we'll discard.
                await db.syncQueue.delete(tx.id!);
            } else {
              throw new Error(`Sync failed with status: ${response.status}`);
            }
          } catch (error) {
            console.error('Failed to sync transaction:', tx.id, error);
            await db.syncQueue.update(tx.id!, { status: 'failed' });
          }
        }
        setIsSyncing(false);
      }
    };

    syncData();
  }, [isOnline, pendingTransactions, isSyncing]);

  const addToSyncQueue = async (url: string, method: 'POST' | 'PUT' | 'DELETE', payload: any) => {
    try {
      await db.syncQueue.add({
        url,
        method,
        payload,
        timestamp: Date.now(),
        status: 'pending',
      });
    } catch (error) {
      console.error("Failed to add to sync queue", error);
    }
  };

  return { 
    isSyncing, 
    pendingCount: pendingTransactions?.length || 0,
    addToSyncQueue 
  };
};
