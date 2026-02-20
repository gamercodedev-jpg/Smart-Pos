import React, { useState, useEffect } from "react";
import { useTenantQuery } from "@/lib/safeQuery";
import { deleteItem } from "@/lib/crudDelete";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export const InventoryManager: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<InventoryItem>>({});
  const fetchItems = useTenantQuery("stock_items");

  useEffect(() => {
    fetchItems().then(({ data }) => setItems(data || []));
  }, []);

  const handleSave = () => {
    // Save to DB (Supabase/Dexie)
    // ...existing code...
    if (editing) {
      // Edit
      setItems(items.map(i => i.id === editing.id ? { ...editing, ...form } as InventoryItem : i));
    } else {
      // Add
      const newItem = { ...form, id: Date.now().toString() } as InventoryItem;
      setItems([...items, newItem]);
    }
    setShowModal(false);
    setEditing(null);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    await deleteItem("stock_items", id);
    setItems(items.filter(i => i.id !== id));
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({});
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditing(item);
    setForm(item);
    setShowModal(true);
  };

  return (
    <div>
      <button className="btn btn-primary mb-4" onClick={openAddModal}>Add Item</button>
      <ul>
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2 mb-2">
            <span>{item.name} (Qty: {item.quantity}, Price: {item.price})</span>
            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(item)}>Edit</button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {showModal && (
        <div className="modal">
          <h3>{editing ? "Edit Item" : "Add Item"}</h3>
          <input placeholder="Name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Quantity" type="number" value={form.quantity || 0} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input placeholder="Price" type="number" value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
};
