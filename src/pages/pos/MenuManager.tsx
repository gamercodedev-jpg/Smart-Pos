import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Pencil, RotateCcw, Upload, Check, ChevronsUpDown } from 'lucide-react';
import type { POSCategory, POSMenuItem } from '@/types/pos';
import { usePosMenu } from '@/hooks/usePosMenu';
import { deletePosCategory, deletePosMenuItem, resetPosMenuToDefaults, upsertPosCategory, upsertPosMenuItem } from '@/lib/posMenuStore';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import React from "react";
import { useTenantQuery } from "@/lib/safeQuery";
import { deleteItem } from "@/lib/crudDelete";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const fetchItems = useTenantQuery("pos_menu_items");

  useEffect(() => {
    fetchItems().then(({ data }) => setItems(data || []));
  }, []);

  const handleSave = () => {
    // Save to DB (Supabase/Dexie)
    if (editing) {
      // Edit
      setItems(items.map(i => i.id === editing.id ? { ...editing, ...form } as MenuItem : i));
    } else {
      // Add
      const newItem = { ...form, id: Date.now().toString() } as MenuItem;
      setItems([...items, newItem]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    await deleteItem("pos_menu_items", id);
    setItems(items.filter(i => i.id !== id));
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
      <button className="btn btn-primary mb-4" onClick={openAddModal}>Add Menu Item</button>
      <ul>
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2 mb-2">
            <span>{item.name} (Price: {item.price})</span>
            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(item)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {showModal && (
        <div className="modal">
          <h3>{editing ? "Edit Menu Item" : "Add Menu Item"}</h3>
          <input placeholder="Name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Price" type="number" value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <input placeholder="Image URL" value={form.image || ""} onChange={e => setForm({ ...form, image: e.target.value })} />
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
};
