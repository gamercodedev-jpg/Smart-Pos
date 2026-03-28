import React, { useMemo, useState, useSyncExternalStore, useEffect } from 'react';
import { ArrowRight, Calendar, Check, ChevronsUpDown, Plus, Search } from 'lucide-react';

import { PageHeader, DataTableWrapper, NumericCell } from '@/components/common/PageComponents';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

import type { StockItem } from '@/types';
import { getStockItemsSnapshot, subscribeStockItems } from '@/lib/stockStore';
import {
  createStockIssue,
  getStockIssuesSnapshot,
  StockIssueError,
  subscribeStockIssues,
  ensureStockIssuesLoaded,
} from '@/lib/stockIssueStore';
import { cn } from '@/lib/utils';

type DraftIssueLine = {
  id: string;
  stockItemId: string;
  qty: string; // user-entered qty in inputUnit
  inputUnit?: string; // e.g., 'kg','g','l','ml','each','pack'
  issueType?: 'Wastage' | 'Expired' | 'Staff Meal' | 'Theft' | 'Damage';
  notes?: string;
};

function StockItemPicker(props: {
  value: string;
  onChange: (id: string) => void;
  items: StockItem[];
  placeholder: string;
  disabled?: boolean;
}) {
  const selected = props.items.find((i) => i.id === props.value) ?? null;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', !selected && 'text-muted-foreground')}
          disabled={props.disabled}
        >
          {selected ? `${selected.code} - ${selected.name} (Stock: ${Number.isFinite(selected.currentStock) ? selected.currentStock.toFixed(2) : selected.currentStock} ${baseUnitLabel(selected.unitType)})` : props.placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type code or name..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {props.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.code} ${item.name}`}
                  onSelect={() => {
                    props.onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', props.value === item.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{item.code} - {item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Stock: {Number.isFinite(item.currentStock) ? item.currentStock.toFixed(2) : item.currentStock} {baseUnitLabel(item.unitType)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function baseUnitLabel(unitType: any) {
  if (unitType === 'KG') return 'kg';
  if (unitType === 'LTRS') return 'l';
  if (unitType === 'PACK') return 'pack';
  return 'each';
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function StockIssues() {
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);
  const issues = useSyncExternalStore(subscribeStockIssues, getStockIssuesSnapshot);
  const [loading, setLoading] = useState(true);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [issueDate, setIssueDate] = useState<string>(dateKeyLocal(new Date()));
  const [createdBy, setCreatedBy] = useState('System');
  const [search, setSearch] = useState('');

  const [draftLines, setDraftLines] = useState<DraftIssueLine[]>(() => [
    { id: `dl-${crypto.randomUUID()}`, stockItemId: '', qty: '', inputUnit: undefined, issueType: 'Wastage', notes: '' },
  ]);

  const storeItems = useMemo(() => {
    const store = stockItems.filter((s) => String(s.code).startsWith('4'));
    return store.length ? store : stockItems;
  }, [stockItems]);

  const departmentItems = useMemo(() => {
    const dept = stockItems.filter((s) => !String(s.code).startsWith('4'));
    return dept.length ? dept : stockItems;
  }, [stockItems]);

  function round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  

  function allowedInputUnits(unitType: any, itemsPerPack?: number) {
    if (unitType === 'KG') return ['kg', 'g'];
    if (unitType === 'LTRS') return ['l', 'ml'];
    if (unitType === 'PACK') return itemsPerPack && itemsPerPack > 0 ? ['pack', 'each'] : ['pack'];
    return ['each'];
  }

  function toBaseQuantity(params: { qty: number; inputUnit: string; unitType: any; itemsPerPack?: number }) {
    const qty = Number.isFinite(params.qty) ? params.qty : 0;
    const inputUnit = String(params.inputUnit || '').toLowerCase();

    if (params.unitType === 'KG') {
      if (inputUnit === 'g') return round2(qty / 1000);
      return round2(qty);
    }

    if (params.unitType === 'LTRS') {
      if (inputUnit === 'ml') return round2(qty / 1000);
      return round2(qty);
    }

    if (params.unitType === 'PACK') {
      if (inputUnit === 'each') {
        const n = Number(params.itemsPerPack ?? 0);
        if (!n || n <= 0) return 0;
        return round2(qty / n);
      }
      return round2(qty);
    }

    return round2(qty);
  }

  const validated = useMemo(() => {
    const eps = 1e-9;
    const lines = draftLines.map((l) => {
      const item = stockItems.find((s) => s.id === l.stockItemId) ?? null;
      const qtyRaw = Number(l.qty);
      const qty = Number.isFinite(qtyRaw) ? qtyRaw : 0;
      const touched = Boolean(l.stockItemId || (l.qty && l.qty.trim()));

      const inputUnit = l.inputUnit ?? (item ? baseUnitLabel(item.unitType) : 'each');
      const baseQty = item ? toBaseQuantity({ qty, inputUnit, unitType: item.unitType, itemsPerPack: item.itemsPerPack }) : 0;

      const errors: string[] = [];
      if (touched) {
        if (!item) errors.push('Select an item.');
        if (!(qty > 0)) errors.push('Enter an issue quantity > 0.');
        if (item) {
          const onHand = Number.isFinite(item.currentStock) ? item.currentStock : 0;
          if (baseQty > onHand + eps) errors.push(`Insufficient stock (on hand: ${onHand}).`);
        }
        // Notes are optional now; do not force entry for Theft/Damage.
      }

      const ok = touched ? errors.length === 0 : false;
      return { ...l, item, qty, inputUnit, baseQty, touched, ok, errors } as any;
    });

    const validLines = lines.filter((l) => l.ok);
    const invalidTouchedLines = lines.filter((l) => l.touched && !l.ok);
    const totalValue = validLines.reduce((sum, l) => {
      const unitCost = l.item && Number.isFinite(l.item.currentCost) ? l.item.currentCost : 0;
      return sum + l.baseQty * unitCost;
    }, 0);

    return {
      lines,
      validLines,
      invalidTouchedLines,
      totalValue,
      canConfirm: validLines.length > 0 && invalidTouchedLines.length === 0,
    };
  }, [draftLines, stockItems]);

  const issueGroups = useMemo(() => {
    const grouped = new Map<
      number,
      { issueNo: number; date: string; createdBy: string; items: typeof issues; totalValue: number }
    >();

    for (const issue of issues) {
      const existing = grouped.get(issue.issueNo) ?? {
        issueNo: issue.issueNo,
        date: issue.date,
        createdBy: issue.createdBy,
        items: [],
        totalValue: 0,
      };
      existing.items = [...existing.items, issue];
      existing.totalValue = (existing.totalValue ?? 0) + (Number.isFinite(issue.value) ? issue.value : 0);
      grouped.set(issue.issueNo, existing);
    }

    const all = Array.from(grouped.values()).sort((a, b) => b.issueNo - a.issueNo);
    const q = search.trim().toLowerCase();
    if (!q) return all;

    return all.filter((g) => {
      if (String(g.issueNo).includes(q)) return true;
      if (String(g.createdBy).toLowerCase().includes(q)) return true;
      if (String(g.date).toLowerCase().includes(q)) return true;
      return g.items.some((it) =>
        `${it.originItemCode} ${it.destinationItemCode}`.toLowerCase().includes(q)
      );
    });
  }, [issues, search]);

  function resetDialog() {
    setDraftLines([{ id: `dl-${crypto.randomUUID()}`, stockItemId: '', qty: '', inputUnit: undefined, issueType: 'Wastage', notes: '' }]);
    setCreatedBy('System');
    setIssueDate(dateKeyLocal(new Date()));
  }

  // Load DB-backed issues on mount and show loading state while fetching.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await ensureStockIssuesLoaded();
      } catch (e) {
        // ignore; store will log debug
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function addLine() {
    setDraftLines((prev) => [...prev, { id: `dl-${crypto.randomUUID()}`, stockItemId: '', qty: '', inputUnit: undefined, issueType: 'Wastage', notes: '' }]);
  }

  function removeLine(id: string) {
    setDraftLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function confirmIssue() {
    if (!validated.canConfirm) return;

    try {
      const payloadLines = validated.validLines.map((l: any) => ({
        stockItemId: l.stockItemId,
        issueType: l.issueType,
        qtyIssued: l.baseQty,
        unitCostAtTime: l.item?.currentCost ?? undefined,
        notes: l.notes ?? null,
      }));

      await createStockIssue({
        date: issueDate,
        createdBy: createdBy.trim() || 'System',
        lines: payloadLines,
      });

      toast({ title: 'Stock issued', description: `Saved ${payloadLines.length} issue(s).` });
      setIsAddDialogOpen(false);
      resetDialog();
    } catch (e) {
      const msg = e instanceof StockIssueError ? e.message : (e as Error)?.message ?? 'Failed to create issue.';
      toast({ title: 'Cannot issue stock', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock Issues"
        description="Record internal stock transfers from Main Store to Departments"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Create Stock Issue</DialogTitle>
                <DialogDescription>Transfer stock from Main Store to a Department</DialogDescription>
              </DialogHeader>

              {validated.invalidTouchedLines.length ? (
                <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-md mb-2">
                  <p className="text-sm font-medium text-destructive">Fix the following errors before saving:</p>
                  <ul className="mt-2 text-sm text-destructive list-disc list-inside">
                    {validated.invalidTouchedLines.map((ln) => {
                      const idx = draftLines.findIndex(d => d.id === ln.id);
                      return <li key={ln.id}>Line {idx + 1}: {ln.errors?.[0] ?? 'Invalid'}</li>;
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createdBy">Created By</Label>
                    <Input
                      id="createdBy"
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Issue Lines</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-2" /> Add line
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {draftLines.map((l, idx) => {
                      const item = stockItems.find((s) => s.id === l.stockItemId) ?? null;
                      const qty = Number(l.qty);
                      const qtyNum = Number.isFinite(qty) ? qty : 0;
                      const inputUnit = l.inputUnit ?? (item ? baseUnitLabel(item.unitType) : 'each');
                      const unitOptions = item ? allowedInputUnits(item.unitType, item.itemsPerPack) : ['each'];

                      const validatedLine = validated.lines.find((x) => x.id === l.id) as any;
                      const invalid = Boolean(validatedLine?.touched && !validatedLine?.ok);

                      return (
                        <Card key={l.id} className="bg-muted/30">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Line {idx + 1}</div>
                              {draftLines.length > 1 ? (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(l.id)}>
                                  Remove
                                </Button>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Item</Label>
                                <StockItemPicker
                                  value={l.stockItemId}
                                  onChange={(v) => setDraftLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, stockItemId: v } : x)))}
                                  items={stockItems}
                                  placeholder="Select item"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Issue Type</Label>
                                <Select value={l.issueType ?? 'Wastage'} onValueChange={(v) => setDraftLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, issueType: v as any } : x)))}>
                                  <SelectTrigger className={cn('h-9 w-full', invalid && 'border-destructive')}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Wastage">Wastage</SelectItem>
                                    <SelectItem value="Expired">Expired</SelectItem>
                                    <SelectItem value="Staff Meal">Staff Meal</SelectItem>
                                    <SelectItem value="Theft">Theft</SelectItem>
                                    <SelectItem value="Damage">Damage</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                              <div className="space-y-2 sm:col-span-1">
                                <Label>Qty</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={l.qty}
                                  className={cn(invalid && 'border-destructive')}
                                  onChange={(e) => setDraftLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, qty: e.target.value } : x)))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={inputUnit} onValueChange={(v) => setDraftLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, inputUnit: v } : x)))}>
                                  <SelectTrigger className={cn('h-9 w-full', invalid && 'border-destructive')}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unitOptions.map((u) => (
                                      <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2 sm:col-span-2">
                                <Label>Notes</Label>
                                <Input value={l.notes ?? ''} className={cn(invalid && 'border-destructive')} onChange={(e) => setDraftLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, notes: e.target.value } : x)))} />
                              </div>
                            </div>

                            <div>
                              {item && qtyNum > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs text-muted-foreground">Current Stock</div>
                                    <div className="font-medium">{item.currentStock.toFixed(2)} {item.unitType}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">New Stock</div>
                                    <div className="font-medium">{(item.currentStock - (validatedLine?.baseQty ?? 0)).toFixed(2)} {item.unitType}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Select item and qty to preview.</div>
                              )}
                            </div>

                            {validatedLine?.touched && validatedLine?.errors?.length ? (
                              <div className="text-xs text-destructive">{validatedLine.errors[0]}</div>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {validated.validLines.length > 0 || validated.invalidTouchedLines.length > 0 ? (
                    <Card className="border-primary">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium mb-2">Issue Summary</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>Valid lines:</span>
                          <span className="font-medium">{validated.validLines.length}</span>
                        </div>
                        {validated.invalidTouchedLines.length ? (
                          <div className="flex items-center justify-between text-sm text-destructive">
                            <span>Lines to fix:</span>
                            <span className="font-medium">{validated.invalidTouchedLines.length}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between text-sm">
                          <span>Estimated value:</span>
                          <span className="font-medium">K {validated.totalValue.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={confirmIssue} disabled={!validated.canConfirm || isSaving}>
                  {isSaving ? (
                    <>
                      <span className="inline-block h-4 w-4 mr-2 animate-spin rounded-full border-t-2 border-b-2 border-white/50" />
                      Saving...
                    </>
                  ) : (
                    'Confirm Issue'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary/60 border-opacity-30" />
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" disabled>
          <Calendar className="h-4 w-4 mr-2" />
          Date Range
        </Button>
      </div>

      <div className="space-y-4">
        {issueGroups.map((group) => (
          <Card key={group.issueNo}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div>
                  <p className="font-medium">Issue #{group.issueNo}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.date} • By {group.createdBy}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="font-medium">K {group.totalValue.toFixed(2)}</p>
                </div>
              </div>

              <DataTableWrapper className="border-0 rounded-none">
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origin Code</TableHead>
                      <TableHead>Dest Code</TableHead>
                      <TableHead className="text-right">Was</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Now</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-mono">{issue.originItemCode}</TableCell>
                        <TableCell className="font-mono">{issue.destinationItemCode}</TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={issue.wasQty} />
                        </TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={issue.issuedQty} showSign colorCode />
                        </TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={issue.nowQty} />
                        </TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={issue.value} money showSign colorCode />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            </CardContent>
          </Card>
        ))}

        {!issueGroups.length && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">No stock issues found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
