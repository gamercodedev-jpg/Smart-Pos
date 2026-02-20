// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  timestamp: number; // For conflict resolution
  status: 'pending' | 'syncing' | 'failed';
}

export class MySubClassedDexie extends Dexie {
  syncQueue!: Table<SyncQueueItem>; 

  constructor() {
    super('profitMakerDB');
    this.version(1).stores({
      syncQueue: '++id, status, timestamp', // Primary key and indexed props
    });
  }
}

export const db = new MySubClassedDexie();
