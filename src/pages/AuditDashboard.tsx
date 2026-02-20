import { useMemo, useSyncExternalStore } from 'react';
import { SystemAuditLogEntry } from '@/types';
import {
  analyzeSuspiciousActivity,
  logSensitiveAction,
  subscribeAuditLogs,
  getAuditLogsSnapshot,
  clearAuditLogs,
} from '@/lib/systemAuditLog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { downloadTextFile } from '@/lib/download';

export default function AuditDashboard() {
  const { user } = useAuth();
  const logs = useSyncExternalStore(subscribeAuditLogs, getAuditLogsSnapshot, getAuditLogsSnapshot);
  const suspiciousLogs = useMemo(() => analyzeSuspiciousActivity(logs), [logs]);

  const handleManualLog = async () => {
    await logSensitiveAction({
      userId: user?.id ?? 'system',
      userName: user?.name ?? 'System',
      actionType: 'cash_drawer_open',
      notes: 'No sale - change required',
      captureGeo: true,
    });
  };

  const handleExport = () => {
    downloadTextFile({
      filename: `audit-logs-${new Date().toISOString().slice(0, 10)}.json`,
      content: JSON.stringify(logs, null, 2),
      mimeType: 'application/json',
    });
  };

  const handleClear = () => {
    clearAuditLogs();
  };

  const isSuspicious = (logId: string) => suspiciousLogs.some(log => log.id === logId);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manager Dashboard: System Audit Log</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>Export JSON</Button>
          <Button variant="outline" onClick={handleClear}>Clear</Button>
          <Button onClick={handleManualLog}>Log Drawer Open</Button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {logs.map(log => (
              <tr key={log.id} className={isSuspicious(log.id) ? 'bg-red-900/50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{log.userName} ({log.userId})</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{log.actionType.replace('_', ' ')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.previousValue && log.newValue ? `${log.previousValue} -> ${log.newValue}` : log.notes}
                  {isSuspicious(log.id) && <div className="text-red-400 text-xs mt-1">{suspiciousLogs.find(s=>s.id === log.id)?.notes}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.geoLocation ? `${log.geoLocation.latitude.toFixed(4)}, ${log.geoLocation.longitude.toFixed(4)} (Acc: ${log.geoLocation.accuracy}m)` : 'Not available'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
