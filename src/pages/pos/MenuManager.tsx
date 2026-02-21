import { useState, useEffect, useSyncExternalStore } from 'react';
import { PageHeader } from '@/components/common/PageComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Pencil, RotateCcw, Upload, Check, ChevronsUpDown } from 'lucide-react';
import type { POSCategory, POSMenuItem } from '@/types/pos';
import { getManufacturingRecipesSnapshot, subscribeManufacturingRecipes } from '@/lib/manufacturingRecipeStore';
import { getStockItemsSnapshot, subscribeStockItems } from '@/lib/stockStore';
import { RecipeEditorDialog } from '@/pages/manufacturing/Recipes';
import { getPosMenuItemsSnapshot, subscribePosMenu } from '@/lib/posMenuStore';
import { isSupabaseConfigured, supabase, SUPABASE_BUCKET } from '@/lib/supabaseClient';
import { usePosMenu } from '@/hooks/usePosMenu';
import { deletePosCategory, deletePosMenuItem, resetPosMenuToDefaults, upsertPosCategory, upsertPosMenuItem } from '@/lib/posMenuStore';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import React from "react";
import { deleteItem } from "@/lib/crudDelete";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId?: string;
  code?: string;
  description?: string;
}

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [recipes, setRecipes] = useState<{ id: string; parentItemName: string; parentItemCode: string }[]>([]);
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);
  const [recipeEditorOpen, setRecipeEditorOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const local = getPosMenuItemsSnapshot();
        if (mounted) setItems(local as any);
      } catch {
        if (mounted) setItems([]);
      }
    };

    void load();

    const unsub = subscribePosMenu(() => {
      try {
        setItems(getPosMenuItemsSnapshot() as any);
      } catch {
        // ignore
      }
    });

    const unsubR = subscribeManufacturingRecipes(() => {
      try {
        const r = getManufacturingRecipesSnapshot().map((x) => ({ id: x.id, parentItemName: x.parentItemName, parentItemCode: x.parentItemCode }));
        setRecipes(r);
      } catch {
        // ignore
      }
    });

    // seed initial recipes and categories
    try {
      const r = getManufacturingRecipesSnapshot().map((x) => ({ id: x.id, parentItemName: x.parentItemName, parentItemCode: x.parentItemCode }));
      setRecipes(r);
      try { /* categories loaded separately from departments */ } catch {}
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      unsub();
      try { unsubR(); } catch {}
    };
  }, []);

  // Keep preview in sync when editing existing items
  useEffect(() => {
    const img = (form as any).image ?? '';
    if (!img) { setPreviewUrl(undefined); return; }
    // If it's a URL show directly, otherwise try to resolve from storage
    if (typeof img === 'string' && img.startsWith('http')) {
      setPreviewUrl(img);
      return;
    }
    if (isSupabaseConfigured() && supabase && typeof img === 'string') {
      try {
        const path = img.replace(/^\/+/, '');
        const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
        const pub = (data as any)?.publicUrl ?? undefined;
        if (!pub) console.debug('[MenuManager] getPublicUrl returned no publicUrl for', path, data);
        setPreviewUrl(pub);
      } catch {
        setPreviewUrl(undefined);
      }
    }
  }, [form.image]);

  // Load departments (used as "Category" in the UI) from Supabase or fallback to empty
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          // Departments are equivalent to categories in this project.
          // Prefer loading `departments` so selected ids match `products.category_id`.
          try {
            const { data } = await supabase.from('departments').select('id,name').order('name', { ascending: true });
            if (!mounted) return;
            if (Array.isArray(data) && data.length) {
              setCategories((data as any).map((d: any) => ({ id: String(d.id), name: String(d.name) })));
              return;
            }
          } catch {
            // fall back to public `categories`
          }

          try {
            const { data } = await supabase.from('categories').select('id,name').order('name', { ascending: true });
            if (!mounted) return;
            if (Array.isArray(data)) setCategories((data as any).map((d: any) => ({ id: String(d.id), name: String(d.name) })));
          } catch {
            setCategories([]);
          }
        } else {
          setCategories([]);
        }
      } catch {
        if (mounted) setCategories([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    // Map small MenuItem -> POSMenuItem shape for store
    const payload: any = {
      id: editing?.id ?? String(Date.now()),
      name: String(form.name ?? ''),
      price: Number(form.price ?? 0) || 0,
      cost: 0,
      image: form.image ?? undefined,
      isAvailable: true,
      modifierGroups: undefined,
      trackInventory: false,
      description: String((form as any).description ?? ''),
    };
    // include categoryId only when explicitly provided
    if ((form as any).categoryId) payload.categoryId = String((form as any).categoryId);
    // Only include code when explicitly provided by the user (keep it optional)
    if ((form as any).code && String((form as any).code).trim()) payload.code = String((form as any).code).trim();

    // Require an uploaded image path from storage
    if (!((form as any).image)) {
      alert('Please upload an image for the menu item (from Storage)');
      return;
    }

    try {
      await upsertPosMenuItem(payload);
      // reflect authoritative snapshot from store
      setItems(getPosMenuItemsSnapshot().map((i) => ({ id: i.id, name: i.name, price: i.price, image: i.image, description: (i as any).description })) as any);
    } catch (err) {
      console.error('Save failed', err);
      // fallback local optimistic update
      if (editing) setItems(items.map(i => i.id === editing.id ? { ...editing, ...form } as MenuItem : i));
      else setItems([...items, { ...form, id: String(Date.now()) } as MenuItem]);
      alert('Failed to save item to remote. Check console for details.');
    }

    setShowModal(false);
    setEditing(null);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    // Optimistically remove from UI
    setItems((prev) => prev.filter(i => i.id !== id));

    // Attempt store delete; await result and refresh authoritative snapshot
    try {
      await deletePosMenuItem(id);
      setItems(getPosMenuItemsSnapshot().map((i) => ({ id: i.id, name: i.name, price: i.price, image: i.image })) as any);
    } catch (err) {
      console.error('Delete failed', err);
      // fallback attempt via API helper
      try {
        await deleteItem('products', id);
        setItems((prev) => prev.filter(i => i.id !== id));
      } catch (e) {
        console.error('Delete fallback failed', e);
        alert('Failed to delete item. It may still exist remotely.');
        // refresh from store to reflect remote state
        setItems(getPosMenuItemsSnapshot().map((i) => ({ id: i.id, name: i.name, price: i.price, image: i.image })) as any);
      }
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({});
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditing(item);
    setForm(item);
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader title="POS Menu" description="Manage items sold at the POS" actions={<Button onClick={openAddModal}><Plus className="h-4 w-4 mr-2" />Add Menu Item</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => {
          // Resolve image preview (storage path or remote URL)
          let imgSrc: string | undefined = undefined;
          // Find linked recipe (by matching code)
          const linkedRecipe = recipes.find(r => String(r.parentItemCode) === String((item as any).code));
          try {
            const img = (item as any).image;
            if (img) {
              if (typeof img === 'string' && img.startsWith('http')) imgSrc = img;
              else if (isSupabaseConfigured() && supabase && typeof img === 'string') {
                try {
                  const path = (img as string).replace(/^\/+/, '');
                  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
                  imgSrc = (data as any)?.publicUrl ?? undefined;
                  if (!imgSrc) console.debug('[MenuManager] card getPublicUrl returned no publicUrl for', path, data);
                } catch (err) {
                  console.debug('[MenuManager] failed to getPublicUrl', err);
                  imgSrc = undefined;
                }
              }
            }
          } catch (e) {
            console.debug('[MenuManager] image resolve error', e);
            imgSrc = undefined;
          }

          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{item.name}</CardTitle>
                    {(item as any).code ? (
                      <div className="text-xs text-muted-foreground mt-1">Code: {(item as any).code}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button aria-label={`Edit ${item.name}`} variant="ghost" size="icon" onClick={() => openEditModal(item as any)}><Pencil className="h-4 w-4" /></Button>
                    <Button aria-label={`Delete ${item.name}`} variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-start">
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.name} className="h-36 w-36 object-cover rounded-md shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="h-36 w-36 bg-muted-foreground/10 rounded-md flex items-center justify-center text-sm text-muted-foreground">No image</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground font-medium">Price: K {Number(item.price).toFixed(2)}</div>
                    {(item as any).description ? (
                      <div className="mt-2 text-sm text-muted-foreground break-words">{(item as any).description}</div>
                    ) : null}
                    <div className="mt-2 text-sm text-muted-foreground">Recipe: {linkedRecipe ? linkedRecipe.parentItemName : 'None'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            <DialogDescription className="sr-only">Add or edit a menu item</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Link to Recipe (optional)</Label>
              <Select value={(form as any).code ?? '__none__'} onValueChange={(v) => {
                // treat sentinel '__none__' as clearing the selection
                if (v === '__none__') {
                  setForm({ ...form, code: '' });
                  return;
                }
                // find recipe and autofill name/code when selected
                const sel = recipes.find(r => r.parentItemCode === v || r.id === v);
                if (sel) setForm({ ...form, name: sel.parentItemName, code: sel.parentItemCode });
                else setForm({ ...form, code: v });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="(none)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.parentItemCode || r.id}>{r.parentItemName} — {r.parentItemCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {((form.name ?? '').toString().trim() && ((form as any).code ?? '').toString().trim()) ? (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setRecipeEditorOpen(true)}><Plus className="h-4 w-4 mr-2" />Add recipe</Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={(form as any).categoryId ?? '__none__'} onValueChange={(v) => {
                if (v === '__none__') { setForm({ ...form, categoryId: undefined }); return; }
                setForm({ ...form, categoryId: v });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="(none)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Code (optional)</Label>
              <div className="flex gap-2">
                <Input value={(form as any).code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                <Button onClick={() => setForm({ ...form, code: `SKU-${Date.now().toString().slice(-6)}` })}>Auto-generate SKU</Button>
              </div>
              <div className="text-sm text-muted-foreground">Optional: add a SKU/code to link to recipes later. Leave empty to add later.</div>
            </div>
            <div className="space-y-1">
              <Label>Price</Label>
              <Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Image (upload from Storage)</Label>
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!isSupabaseConfigured() || !supabase) {
                  alert('Supabase not configured - cannot upload image');
                  return;
                }
                try {
                  setUploading(true);
                  const bucket = SUPABASE_BUCKET;
                  const path = `${Date.now()}-${f.name.replace(/\s+/g, '_')}`;
                  const res = await supabase.storage.from(bucket).upload(path, f);
                  if (res.error) {
                    console.error('Supabase storage.upload error', res);
                    alert('Image upload failed: ' + (res.error.message || 'unknown error') + '\nCheck bucket name and permissions');
                    return;
                  }
                  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
                  setForm({ ...form, image: path });
                  setPreviewUrl((data as any)?.publicUrl ?? undefined);
                } catch (err) {
                  console.error('Image upload exception', err);
                  alert('Image upload failed: ' + String(err));
                } finally {
                  setUploading(false);
                }
              }} />
              <div>
                {uploading ? <div className="text-sm text-muted-foreground">Uploading…</div> : null}
                {previewUrl ? <img src={previewUrl} alt="preview" className="h-24 w-24 object-cover mt-2" /> : null}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input value={(form as any).description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          <RecipeEditorDialog
            open={recipeEditorOpen}
            onOpenChange={setRecipeEditorOpen}
            editing={null}
            stockItems={stockItems}
            initialValues={{ parentItemName: String(form.name ?? ''), parentItemCode: String((form as any).code ?? ''), parentItemId: String((form as any).categoryId ?? '') }}
            onSaved={(r) => {
              // link created recipe to current form
              try {
                setForm({ ...form, code: r.parentItemCode, name: r.parentItemName });
              } catch {
                // ignore
              }
            }}
          />
    </div>
  );
};
