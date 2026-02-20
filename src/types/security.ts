// src/types/security.ts

export type SecurityEventLevel = 'Info' | 'Warning' | 'High-Alert';

export interface SecurityEvent {
  id: string;
  timestamp: number;
  level: SecurityEventLevel;
  eventType: string;
  description: string;
  userId: string;
  meta?: Record<string, any>;
}

export interface OpenOrder {
  orderId: string;
  openedAt: number;
  staffName: string;
  table: string;
}
