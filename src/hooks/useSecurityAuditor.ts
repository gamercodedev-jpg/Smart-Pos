// src/hooks/useSecurityAuditor.ts
import { useState, useEffect, useCallback } from 'react';
import { SecurityEvent, OpenOrder, SecurityEventLevel } from '@/types/security';
import { v4 as uuidv4 } from 'uuid';
import { logSensitiveAction } from '@/lib/systemAuditLog';

const VOID_LIMIT = 3;
const VOID_TIMEFRAME_MS = 60 * 60 * 1000; // 1 hour
const TIME_TO_SERVICE_LIMIT_MS = 45 * 60 * 1000; // 45 minutes

export const useSecurityAuditor = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [voidTimestamps, setVoidTimestamps] = useState<number[]>([]);

  const addEvent = useCallback((level: SecurityEventLevel, eventType: string, description: string, userId: string, meta?: Record<string, any>) => {
    const newEvent: SecurityEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      eventType,
      description,
      userId,
      meta,
    };
    setEvents(prev => [newEvent, ...prev]);
  }, []);

  // Monitor for serial voiding
  const logVoid = useCallback((userId: string, itemId: string) => {
    const now = Date.now();
    const recentVoids = [...voidTimestamps, now].filter(ts => now - ts < VOID_TIMEFRAME_MS);

    setVoidTimestamps(recentVoids);

    if (recentVoids.length > VOID_LIMIT) {
      addEvent(
        'High-Alert',
        'Serial Voiding Detected',
        `User ${userId} voided ${recentVoids.length} items in the last hour.`,
        userId,
        { voidCount: recentVoids.length }
      );

      void logSensitiveAction({
        userId,
        userName: userId,
        actionType: 'security_alert',
        reference: itemId,
        notes: `Serial voiding detected: ${recentVoids.length} voids in the last hour.`,
      }).catch(() => {});
    } else {
      addEvent(
        'Info',
        'Item Voided',
        `User ${userId} voided item ${itemId}.`,
        userId,
        { itemId }
      );

      void logSensitiveAction({
        userId,
        userName: userId,
        actionType: 'void',
        reference: itemId,
        notes: 'Item voided.',
      }).catch(() => {});
    }
  }, [addEvent, voidTimestamps]);

  // Monitor for long-open orders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      openOrders.forEach(order => {
        if (now - order.openedAt > TIME_TO_SERVICE_LIMIT_MS) {
          // Avoid creating duplicate alerts for the same overdue order
          const alreadyAlerted = events.some(e => e.eventType === 'Time-to-Service Exceeded' && e.meta?.orderId === order.orderId);
          if (!alreadyAlerted) {
            addEvent(
              'Warning',
              'Time-to-Service Exceeded',
              `Order ${order.orderId} on table ${order.table} has been open for over 45 minutes.`,
              order.staffName,
              { orderId: order.orderId, openDuration: now - order.openedAt }
            );
          }
        }
      });
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [openOrders, addEvent, events]);

  const createOrder = (staffName: string, table: string) => {
    const newOrder: OpenOrder = {
      orderId: `ORD-${Math.random().toString(36).substr(2, 9)}`,
      openedAt: Date.now(),
      staffName,
      table,
    };
    setOpenOrders(prev => [...prev, newOrder]);
    addEvent('Info', 'Order Created', `Order ${newOrder.orderId} created for table ${table}.`, staffName, { orderId: newOrder.orderId });

    void logSensitiveAction({
      userId: staffName,
      userName: staffName,
      actionType: 'order_open',
      reference: newOrder.orderId,
      notes: `Order opened for table ${table}.`,
    }).catch(() => {});
    return newOrder;
  };

  const closeOrder = (orderId: string, userId: string) => {
    setOpenOrders(prev => prev.filter(o => o.orderId !== orderId));
    addEvent('Info', 'Order Closed', `Order ${orderId} was billed and closed.`, userId, { orderId });

    void logSensitiveAction({
      userId,
      userName: userId,
      actionType: 'order_close',
      reference: orderId,
      notes: 'Order billed and closed.',
    }).catch(() => {});
  };

  return { events, logVoid, createOrder, closeOrder, addEvent };
};
