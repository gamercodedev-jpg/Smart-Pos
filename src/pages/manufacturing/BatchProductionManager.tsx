import React, { useState, useEffect } from "react";
import { useTenantQuery } from "@/lib/safeQuery";
import { deleteItem } from "@/lib/crudDelete";

interface BatchProduction {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
}

export const BatchProductionManager: React.FC = () => {
  const [batches, setBatches] = useState<BatchProduction[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fetchBatches = useTenantQuery("batch_productions");

  useEffect(() => {
    fetchBatches().then(({ data }) => setBatches(data || []));
  }, []);

  const handleDelete = async (id: string) => {
    await deleteItem("batch_productions", id);
    setBatches(batches.filter(b => b.id !== id));
    setDeleteId(null);
  };

  return (
    <div>
      <ul>
        {batches.map(batch => (
          <li key={batch.id} className="flex items-center gap-2 mb-2">
            <span>{batch.name} (Qty: {batch.quantity})</span>
            <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(batch.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {deleteId && (
        <div className="modal">
          <p>Are you sure you want to delete this batch?</p>
          <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Confirm Delete</button>
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
};
