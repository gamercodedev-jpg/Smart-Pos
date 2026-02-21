import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Plus, Search, Edit, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { PageHeader, DataTableWrapper, NumericCell } from '@/components/common/PageComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { DepartmentId, Recipe, RecipeIngredient, StockItem, UnitType } from '@/types';
import { getManufacturingRecipesSnapshot, subscribeManufacturingRecipes, upsertManufacturingRecipe, deleteManufacturingRecipe } from '@/lib/manufacturingRecipeStore';
import { getStockItemsSnapshot, subscribeStockItems } from '@/lib/stockStore';
import { getPosMenuItemsSnapshot, subscribePosMenu } from '@/lib/posMenuStore';
import { cn } from '@/lib/utils';

export default function Recipes() {
  const recipes = useSyncExternalStore(subscribeManufacturingRecipes, getManufacturingRecipesSnapshot);
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);

  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return recipes
      .filter(r => (!q ? true : r.parentItemName.toLowerCase().includes(q) || r.parentItemCode.toLowerCase().includes(q)))
      .slice()
      .sort((a, b) => a.parentItemName.localeCompare(b.parentItemName));
  }, [recipes, searchTerm]);

  const onCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const onEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteManufacturingRecipe(id);
      // fetchFromDb is called inside store delete; snapshot subscription will update UI
    } catch (err) {
      console.error('Delete recipe failed', err);
      alert('Failed to delete recipe. Check console for details.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Recipe Management"
        description="Manage parent-child relationships for batch manufacturing"
        actions={<Button onClick={onCreate}><Plus className="h-4 w-4 mr-2" />New Recipe</Button>}
      />

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{recipe.parentItemName}</CardTitle>
                  <p className="text-sm text-muted-foreground">Code: {recipe.parentItemCode} • Output: {recipe.outputQty} {recipe.outputUnitType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">K {recipe.unitCost.toFixed(2)}/unit</span>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(recipe.id)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(recipe.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTableWrapper>
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Qty Required</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipe.ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell>{ing.ingredientName}</TableCell>
                        <TableCell className="text-right">{ing.requiredQty} {ing.unitType}</TableCell>
                        <TableCell className="text-right"><NumericCell value={ing.unitCost} prefix="K " /></TableCell>
                        <TableCell className="text-right"><NumericCell value={ing.requiredQty * ing.unitCost} prefix="K " /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableWrapper>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecipeEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingId(null);
        }}
        editing={editingId ? recipes.find(r => r.id === editingId) ?? null : null}
        stockItems={stockItems}
        onSaved={(r) => {
          // select the saved recipe and close editor
          try { setEditingId(r.id); } catch {}
          setEditorOpen(false);
        }}
      />
    </div>
  );
}

type DraftIngredient = {
  id: string;
  ingredientId: string;
  requiredQty: number;
};

function safeId(prefix: string) {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function computeCosts(params: { draft: { outputQty: number; ingredients: DraftIngredient[] }; stockItems: StockItem[] }) {
  const byId = new Map(params.stockItems.map(s => [s.id, s] as const));
  const total = params.draft.ingredients.reduce((sum, ing) => {
    const s = byId.get(ing.ingredientId);
    const unitCost = s ? s.currentCost : 0;
    return sum + (Number.isFinite(ing.requiredQty) ? ing.requiredQty : 0) * (Number.isFinite(unitCost) ? unitCost : 0);
  }, 0);
  const outputQty = params.draft.outputQty > 0 ? params.draft.outputQty : 1;
  const unit = total / outputQty;
  return { totalCost: total, unitCost: unit };
}

export function RecipeEditorDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Recipe | null;
  stockItems: StockItem[];
  onSaved?: (r: { id: string; parentItemCode: string; parentItemName: string }) => void;
  initialValues?: { parentItemName?: string; parentItemCode?: string; parentItemId?: string; finishedGoodDepartmentId?: DepartmentId };
}) {
  const { open, onOpenChange, editing, stockItems, initialValues } = props;

  const posMenuItems = useSyncExternalStore(subscribePosMenu, getPosMenuItemsSnapshot, getPosMenuItemsSnapshot);

  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState(editing?.parentItemName ?? '');
  const [code, setCode] = useState(editing?.parentItemCode ?? '');
  const [parentItemId, setParentItemId] = useState(editing?.parentItemId ?? '');
  const [autoLinkedCode, setAutoLinkedCode] = useState<string | null>(null);
  const [finishedDept, setFinishedDept] = useState<DepartmentId>((editing?.finishedGoodDepartmentId ?? '') as DepartmentId);
  const [outputQty, setOutputQty] = useState<number>(editing?.outputQty ?? 1);
  const [outputUnitType, setOutputUnitType] = useState<UnitType>((editing?.outputUnitType ?? 'EACH') as UnitType);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    (editing?.ingredients ?? []).map((i) => ({ id: i.id, ingredientId: i.ingredientId, requiredQty: i.requiredQty }))
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset when opening or changing edit target
  useEffect(() => {
    if (!open) return;
    setName(editing?.parentItemName ?? initialValues?.parentItemName ?? '');
    setCode(editing?.parentItemCode ?? initialValues?.parentItemCode ?? '');
    setParentItemId(editing?.parentItemId ?? initialValues?.parentItemId ?? '');
    setAutoLinkedCode(null);
    setFinishedDept((editing?.finishedGoodDepartmentId ?? initialValues?.finishedGoodDepartmentId ?? (departmentsList.length ? departmentsList[0].id : '')) as DepartmentId);
    setOutputQty(editing?.outputQty ?? 1);
    setOutputUnitType((editing?.outputUnitType ?? 'EACH') as UnitType);
    setIngredients((editing?.ingredients ?? []).map((i) => ({ id: i.id, ingredientId: i.ingredientId, requiredQty: i.requiredQty })));
  }, [open, editing?.id, departmentsList, initialValues?.parentItemCode, initialValues?.parentItemName]);

  const nameMatches = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [] as typeof posMenuItems;
    return posMenuItems.filter(p => (p.name ?? '').toLowerCase().includes(q) || String(p.code ?? '').toLowerCase().includes(q)).slice(0, 10);
  }, [name, posMenuItems]);

  const codeMatches = useMemo(() => {
    const q = code.trim().toLowerCase();
    if (!q) return [] as typeof posMenuItems;
    return posMenuItems.filter(p => String(p.code ?? '').toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q)).slice(0, 10);
  }, [code, posMenuItems]);

  // Load departments from Supabase or fallback to seeded data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('departments').select('id,name').order('name', { ascending: true });
          if (!mounted) return;
          if (Array.isArray(data)) setDepartmentsList(data as any);
        } else {
          // fallback to empty list — Settings page manages seeded fallback and editing should still work
          setDepartmentsList([]);
        }
      } catch {
        // ignore and leave as empty
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const matchedItem = useMemo(() => {
    const c = code.trim();
    if (!c) return null as null | { source: 'pos' | 'stock'; id: string; name: string; code: string };

    // Only match POS/menu items for the parent link. Stock items are ingredients
    // and should not be used as the recipe's parent item. If no POS item is
    // found we'll allow a standalone recipe to be created and linked later.
    const mi = posMenuItems.find((x) => String(x.code).trim() === c) ?? null;
    if (mi) return { source: 'pos' as const, id: mi.id, name: mi.name, code: String(mi.code) };

    return null;
  }, [code, posMenuItems, stockItems]);

  useEffect(() => {
    if (!open) return;
    if (!matchedItem) return;

    // Always keep the internal link in sync with a matched code.
    setParentItemId(matchedItem.id);

    // Auto-fill the name only if the user hasn’t manually edited it.
    const canAutofillName = !name.trim() || autoLinkedCode === code.trim();
    if (canAutofillName) {
      setName(matchedItem.name);
      setAutoLinkedCode(code.trim());
    }
  }, [open, matchedItem, code, name, autoLinkedCode]);

  const cost = useMemo(() => computeCosts({ draft: { outputQty, ingredients }, stockItems }), [outputQty, ingredients, stockItems]);
  const byId = useMemo(() => new Map(stockItems.map(s => [s.id, s] as const)), [stockItems]);

  const addIngredient = (stockItemId: string) => {
    if (ingredients.some(i => i.ingredientId === stockItemId)) {
      setPickerOpen(false);
      return;
    }
    setIngredients(prev => [...prev, { id: safeId('ri'), ingredientId: stockItemId, requiredQty: 0 }]);
    setPickerOpen(false);
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) return;
    if (outputQty <= 0) return;

    const recipeIngredients: RecipeIngredient[] = ingredients
      .map((i) => {
        const s = byId.get(i.ingredientId);
        const unitType = (s?.unitType ?? 'EACH') as UnitType;
        return {
          id: i.id,
          ingredientId: i.ingredientId,
          ingredientCode: s?.code ?? i.ingredientId,
          ingredientName: s?.name ?? i.ingredientId,
          requiredQty: Number.isFinite(i.requiredQty) ? i.requiredQty : 0,
          unitType,
          unitCost: s?.currentCost ?? 0,
        };
      })
      .filter((i) => i.requiredQty > 0);

    await upsertManufacturingRecipe({
      id: editing?.id,
      parentItemId: (parentItemId && parentItemId.trim() ? parentItemId : (editing?.parentItemId ?? trimmedCode)),
      parentItemCode: trimmedCode,
      parentItemName: trimmedName,
      finishedGoodDepartmentId: finishedDept,
      outputQty,
      outputUnitType,
      ingredients: recipeIngredients,
    });

    // Refresh canonical snapshot and notify parent with the saved recipe
    try {
      // find saved recipe by code from canonical snapshot
      const saved = getManufacturingRecipesSnapshot().find(r => String(r.parentItemCode) === trimmedCode) ?? null;
      if (props.onSaved && saved) {
        props.onSaved({ id: saved.id, parentItemCode: saved.parentItemCode, parentItemName: saved.parentItemName });
      }
    } catch (e) {
      // ignore
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Recipe' : 'New Recipe'}</DialogTitle>
          <DialogDescription>
            Link a recipe to a POS/stock code, then define ingredient quantities per batch.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Item Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAutoLinkedCode(null);
              }}
              placeholder="e.g. Burger"
            />
            {nameMatches.length > 0 ? (
              <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-background">
                {nameMatches.map((m) => (
                  <button key={m.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted-foreground/5" onClick={() => {
                    setName(m.name);
                    setCode(String(m.code ?? ''));
                    setParentItemId(m.id);
                    setAutoLinkedCode(String(m.code ?? ''));
                  }}>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.code}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 2030" />
            {matchedItem ? (
              <div className="text-xs text-muted-foreground">Matched POS item: <span className="text-foreground font-medium">{matchedItem.name}</span></div>
            ) : code.trim() ? (
              <div className="text-xs text-muted-foreground">No menu item found for this code — the recipe will be saved standalone and can be linked later.</div>
            ) : null}
            {codeMatches.length > 0 ? (
              <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-background">
                {codeMatches.map((m) => (
                  <button key={m.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted-foreground/5" onClick={() => {
                    setCode(String(m.code ?? ''));
                    setName(m.name);
                    setParentItemId(m.id);
                    setAutoLinkedCode(String(m.code ?? ''));
                  }}>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.code}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Finished Goods Category</Label>
            <Select value={finishedDept} onValueChange={(v) => setFinishedDept(v as DepartmentId)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departmentsList.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Output Qty</Label>
              <Input type="number" min={0.0001} step="0.01" value={outputQty} onChange={(e) => setOutputQty(Math.max(0.0001, Number(e.target.value || 1)))} />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={outputUnitType} onChange={(e) => setOutputUnitType(e.target.value as UnitType)} placeholder="EACH" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total cost: <span className="font-semibold text-foreground">K {cost.totalCost.toFixed(2)}</span> • Unit cost: <span className="font-semibold text-foreground">K {cost.unitCost.toFixed(2)}</span>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Add ingredient
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search stock items..." />
                <CommandEmpty>No stock item found.</CommandEmpty>
                <CommandGroup>
                  {stockItems.map((s) => (
                    <CommandItem key={s.id} value={`${s.name} ${s.code}`} onSelect={() => addIngredient(s.id)}>
                      <Check className={cn('mr-2 h-4 w-4', ingredients.some(i => i.ingredientId === s.id) ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{s.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{s.code}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DataTableWrapper>
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Qty Required</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Add ingredients to build this recipe.</TableCell>
                </TableRow>
              ) : (
                ingredients.map((ing) => {
                  const s = byId.get(ing.ingredientId);
                  const unitCost = s?.currentCost ?? 0;
                  const lineTotal = (Number.isFinite(ing.requiredQty) ? ing.requiredQty : 0) * unitCost;
                  return (
                    <TableRow key={ing.id}>
                      <TableCell>
                        <div className="font-medium">{s?.name ?? ing.ingredientId}</div>
                        <div className="text-xs text-muted-foreground">{s?.code ?? ''}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            className="h-9 w-28 text-right"
                            type="number"
                            min={0}
                            step="0.01"
                            value={ing.requiredQty}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setIngredients(prev => prev.map(p => (p.id === ing.id ? { ...p, requiredQty: Number.isFinite(v) ? v : 0 } : p)));
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{s?.unitType ?? ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><NumericCell value={unitCost} prefix="K " /></TableCell>
                      <TableCell className="text-right"><NumericCell value={lineTotal} prefix="K " /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeIngredient(ing.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save Recipe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
