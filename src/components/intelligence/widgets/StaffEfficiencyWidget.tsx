import type { UseIntelligenceReturn } from '@/hooks/useIntelligence';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function money(n: number) {
  return `R ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function StaffEfficiencyWidget(props: { intel: UseIntelligenceReturn }) {
  const rows = props.intel.staffEfficiency;

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No paid sales in this range.</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead className="text-right">Tickets</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">GP%</TableHead>
            <TableHead className="text-right">Avg ticket</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 12).map((r) => (
            <TableRow key={r.staffId}>
              <TableCell className="font-medium">{r.staffName}</TableCell>
              <TableCell className="text-right">{r.tickets}</TableCell>
              <TableCell className="text-right">{money(r.sales)}</TableCell>
              <TableCell className="text-right">{r.gpPercent.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{money(r.avgTicket)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
