import { SystemAuditLogEntry } from '@/types';

// This is a mock in-memory store for audit log entries.
// In a real application, this would be a database.
export const auditLogStore: SystemAuditLogEntry[] = [
    // Pre-populated data for demo purposes
    {
        id: 'log-1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        userId: 'user-2',
        userName: 'Jane Doe',
        actionType: 'void',
        reference: 'INV-2026-001',
        previousValue: 'K 180.00',
        newValue: 'K 0.00',
        geoLocation: { latitude: -12.45, longitude: 28.11, accuracy: 10 },
        notes: 'Customer changed mind'
    },
    {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        userId: 'user-2',
        userName: 'Jane Doe',
        actionType: 'void',
        reference: 'INV-2026-002',
        previousValue: 'K 45.00',
        newValue: 'K 0.00',
        geoLocation: { latitude: -12.45, longitude: 28.11, accuracy: 10 },
        notes: 'Wrong item selected'
    },
    {
        id: 'log-3',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        userId: 'user-2',
        userName: 'Jane Doe',
        actionType: 'void',
        reference: 'INV-2026-003',
        previousValue: 'K 90.00',
        newValue: 'K 0.00',
        geoLocation: { latitude: -12.45, longitude: 28.11, accuracy: 10 },
        notes: 'Item not available'
    },
    {
        id: 'log-4',
        timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
        userId: 'user-2',
        userName: 'Jane Doe',
        actionType: 'void',
        reference: 'INV-2026-004',
        previousValue: 'K 120.00',
        newValue: 'K 0.00',
        geoLocation: { latitude: -12.45, longitude: 28.11, accuracy: 10 },
        notes: 'Test void'
    },
    {
        id: 'log-5',
        timestamp: new Date().toISOString(),
        userId: 'user-3',
        userName: 'Manager Mike',
        actionType: 'discount',
        reference: 'INV-2026-005',
        previousValue: '0%',
        newValue: '50%',
        geoLocation: { latitude: -13.99, longitude: 29.50, accuracy: 5000 }, // Suspiciously far away
        notes: 'Staff discount'
    }
];
