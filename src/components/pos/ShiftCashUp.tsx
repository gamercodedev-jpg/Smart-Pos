import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, Check, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type PayoutLine = {
  id: string;
  reason: string;
  amount: number;
};

const REASON_CODES = [
  { code: 'milk', label: 'Milk / Ingredients' },
  { code: 'petty_cash', label: 'Petty Cash' },
  { code: 'transport', label: 'Transport' },
  { code: 'emergency', label: 'Emergency' },
  { code: 'other', label: 'Other' },
] as const;

const VARIANCE_THRESHOLD = 50;

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function ShiftCashUp(props: {
  staffName: string;
  openingCash: number;
  defaultCashSales?: number;
  defaultCardSales?: number;
  onSubmit?: (payload: {
    cashSales: number;
    cardSales: number;
    payouts: PayoutLine[];
    actualCash: number;
    variance: number;
    varianceReasonCode?: string;
  }) => void;
}) {
  const [cashSales, setCashSales] = useState(String(props.defaultCashSales ?? 8500));
  const [cardSales, setCardSales] = useState(String(props.defaultCardSales ?? 1200));
  const [actualCash, setActualCash] = useState('8300');

  const [payouts, setPayouts] = useState<PayoutLine[]>([
    { id: `po-${Date.now()}`, reason: 'milk', amount: 100 },
  ]);

  const totalPayouts = useMemo(() => payouts.reduce((sum, p) => sum + (p.amount || 0), 0), [payouts]);

  const expectedCash = useMemo(() => props.openingCash + num(cashSales) - totalPayouts, [props.openingCash, cashSales, totalPayouts]);
  const variance = useMemo(() => num(actualCash) - expectedCash, [actualCash, expectedCash]);

  const needsReason = Math.abs(variance) > VARIANCE_THRESHOLD;
  const [reasonCode, setReasonCode] = useState<string>('');

  const canClose = !needsReason || (needsReason && reasonCode.length > 0);

  const addPayout = () => {
    setPayouts(prev => [
      ...prev,
      { id: `po-${Math.random().toString(16).slice(2)}-${Date.now()}`, reason: 'other', amount: 0 },
    ]);
  };

  const updatePayout = (id: string, patch: Partial<PayoutLine>) => {
    setPayouts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePayout = (id: string) => {
    setPayouts(prev => prev.filter(p => p.id !== id));
  };

  const submit = () => {
    if (!canClose) return;
    props.onSubmit?.({
      cashSales: num(cashSales),
      cardSales: num(cardSales),
      payouts,
      actualCash: num(actualCash),
      variance,
      varianceReasonCode: reasonCode || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift Cash Up (Financial Fortress)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Opening Cash</Label>
              <div className="mt-1 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <div className="font-semibold">K {props.openingCash.toFixed(2)}</div>
              </div>
            </div>
            <div>
              <Label>Cash Sales</Label>
              <Input type="number" value={cashSales} onChange={(e) => setCashSales(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Card Sales</Label>
              <Input type="number" value={cardSales} onChange={(e) => setCardSales(e.target.value)} className="mt-1" />
            </div>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-semibold">Payouts</div>
                <div className="text-xs text-muted-foreground">Manager withdrawals (e.g., milk). Counts against expected cash.</div>
              </div>
              <Button variant="outline" onClick={addPayout} className="gap-2">
                <Plus className="h-4 w-4" /> Add Payout
              </Button>
            </div>

            <div className="mt-3 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Select value={p.reason} onValueChange={(v) => updatePayout(p.id, { reason: v })}>
                          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REASON_CODES.map(r => (
                              <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={String(p.amount)}
                          onChange={(e) => updatePayout(p.id, { amount: num(e.target.value) })}
                          className="w-[140px] ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" onClick={() => removePayout(p.id)} className="gap-2">
                          <Minus className="h-4 w-4" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex justify-end font-semibold">Total Payouts: K {totalPayouts.toFixed(2)}</div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Expected Cash</Label>
              <div className="mt-1 font-bold text-lg">K {expectedCash.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Opening + Cash Sales - Payouts</div>
            </div>
            <div>
              <Label>Actual Cash</Label>
              <Input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="mt-1 text-lg font-semibold" />
            </div>
            <div>
              <Label>Final Variance</Label>
              <div className={cn('mt-1 font-bold text-lg', variance < 0 ? 'text-destructive' : 'text-green-600')}>
                K {variance.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Actual - Expected</div>
            </div>
          </div>

          {needsReason && (
            <Card className="p-4 border-2 border-destructive/40">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-2 w-full">
                  <div className="font-semibold">Variance exceeds K{VARIANCE_THRESHOLD}</div>
                  <div className="text-sm text-muted-foreground">Shift cannot close until a Reason Code is selected.</div>
                  <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger><SelectValue placeholder="Select reason code" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counting_error">Counting error</SelectItem>
                      <SelectItem value="safe_drop">Safe drop not recorded</SelectItem>
                      <SelectItem value="suspected_theft">Suspected theft</SelectItem>
                      <SelectItem value="bank_deposit_timing">Bank deposit timing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline">Save Draft</Button>
            <Button onClick={submit} disabled={!canClose} className="gap-2">
              <Check className="h-4 w-4" /> Close Shift
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
