import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageComponents';
import { buildZraTaxSeasonExport, downloadJson } from '@/lib/zraExport';
import { useAuth } from '@/contexts/AuthContext';
import { logSensitiveAction } from '@/lib/systemAuditLog';

export default function ZRATaxSeason() {
  const { user } = useAuth();
  const data = useMemo(() => buildZraTaxSeasonExport(), []);

  const onExport = () => {
    try {
      void logSensitiveAction({
        userId: user?.id ?? 'system',
        userName: user?.name ?? 'System',
        actionType: 'zra_export',
        reference: `zra-tax-season-${data.generatedAt}`,
        newValue: data.totals.orderCount,
        notes: `ZRA export • orders ${data.totals.orderCount} • gross K ${data.totals.salesGross.toFixed(2)}`,
        captureGeo: false,
      });
    } catch {
      // ignore
    }

    downloadJson(`zra-tax-season-${new Date().toISOString().slice(0, 10)}.json`, data);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="ZRA Tax Season" description="One-click export for ZRA portal" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">Generated: <span className="font-mono">{data.generatedAt}</span></div>
          <div className="text-sm">Orders: <span className="font-semibold">{data.totals.orderCount}</span></div>
          <div className="text-sm">Gross Sales: <span className="font-semibold">K {data.totals.salesGross.toFixed(2)}</span></div>
          <div className="text-sm">VAT (16% incl): <span className="font-semibold">K {data.totals.vatAmount.toFixed(2)}</span></div>
          <div className="text-sm">Net Sales: <span className="font-semibold">K {data.totals.salesNet.toFixed(2)}</span></div>

          <div className="pt-3">
            <Button
              onClick={onExport}
            >
              Export for ZRA
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-2">
            Export is generated from paid orders stored locally (POS/Self-Order).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
