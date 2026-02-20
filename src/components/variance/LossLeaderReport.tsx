// src/components/variance/LossLeaderReport.tsx
import type { LossLeaderReport as LossLeaderReportType } from '@/types/variance';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LossLeaderReportProps {
  report: LossLeaderReportType;
}

const LossLeaderReport = ({ report }: LossLeaderReportProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loss Leader Report</CardTitle>
        <CardDescription>
          Ingredients causing the most financial leakage (Ghost Loss).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead className="text-right">Theoretical Usage</TableHead>
              <TableHead className="text-right">Actual Usage</TableHead>
              <TableHead className="text-right">Variance (Loss)</TableHead>
              <TableHead className="text-right">Financial Loss (K-Value)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.length > 0 ? (
              report.map(item => (
                <TableRow key={item.ingredientId} className="bg-destructive/5">
                  <TableCell className="font-medium">{item.ingredientName}</TableCell>
                  <TableCell className="text-right">{item.theoretical.toFixed(2)} {item.unit}</TableCell>
                  <TableCell className="text-right">{item.actual.toFixed(2)} {item.unit}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {item.variance.toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    ${item.financialLoss.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No significant loss detected.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LossLeaderReport;
