// src/components/security/SecurityAuditLog.tsx
import { SecurityEvent } from "@/types/security";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";

const levelStyles = {
  'Info': { icon: <Info className="h-4 w-4" />, color: 'bg-blue-500' },
  'Warning': { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-amber-500' },
  'High-Alert': { icon: <ShieldAlert className="h-4 w-4" />, color: 'bg-destructive' },
};

const SecurityAuditLog = ({ events }: { events: SecurityEvent[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[120px]">Level</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className={event.level === 'High-Alert' ? 'bg-destructive/10' : ''}>
                <TableCell>{new Date(event.timestamp).toLocaleTimeString()}</TableCell>
                <TableCell>
                  <Badge className={`${levelStyles[event.level].color} text-white`}>
                    <div className="flex items-center">
                      {levelStyles[event.level].icon}
                      <span className="ml-1">{event.level}</span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{event.eventType}</TableCell>
                <TableCell>{event.userId}</TableCell>
                <TableCell>{event.description}</TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No security events logged yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SecurityAuditLog;
