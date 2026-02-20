import { useEffect, useMemo, useState } from 'react';
import { calculateTotalWithTaxes } from '@/lib/taxEngine';
import { getReceiptSettingsSnapshot } from '@/lib/receiptSettingsService';
import { TaxRule } from '@/types';

type DemoLine = { id: string; name: string; quantity: number; price: number };

const STORAGE_KEY = 'mthunzi.taxDemo.items.v1';

function seedItems(): DemoLine[] {
  return [
    { id: '1', name: 'T-Bone Steak', quantity: 2, price: 180 },
    { id: '2', name: 'Castle Lite', quantity: 4, price: 25 },
    { id: '3', name: 'Cheesecake Slice', quantity: 1, price: 65 },
  ];
}

function loadItems(): DemoLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoLine[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // ignore
  }
  return seedItems();
}

export default function TaxEngineDemo() {
  const settings = getReceiptSettingsSnapshot();
  const [country, setCountry] = useState<TaxRule['countryCode']>((settings.countryCode as any) ?? 'ZM');
  const [items, setItems] = useState<DemoLine[]>(() => (typeof window === 'undefined' ? seedItems() : loadItems()));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0) * (Number.isFinite(item.quantity) ? item.quantity : 0), 0),
    [items]
  );
  const taxResult = useMemo(() => calculateTotalWithTaxes(subtotal, country), [subtotal, country]);

  const updateLine = (id: string, patch: Partial<DemoLine>) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), name: 'New Item', quantity: 1, price: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setItems((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Multi-Country Tax Engine</h1>

      <div className="mb-6">
        <label htmlFor="country-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select Country:
        </label>
        <select
          id="country-select"
          value={country}
          onChange={(e) => setCountry(e.target.value as TaxRule['countryCode'])}
          className="bg-gray-800 border border-gray-600 rounded-md p-2 w-full"
        >
          <option value="ZM">Zambia (VAT + Tourism Levy)</option>
          <option value="ZA">South Africa (VAT)</option>
          <option value="US">United States (CA Sales Tax)</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Invoice #INV-2026-001</h2>
        
        {/* Invoice Items */}
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={item.name}
                onChange={(e) => updateLine(item.id, { name: e.target.value })}
                className="col-span-6 bg-gray-800 border border-gray-600 rounded-md p-2"
              />
              <input
                value={item.quantity}
                onChange={(e) => updateLine(item.id, { quantity: Number(e.target.value) })}
                type="number"
                min={0}
                step={1}
                className="col-span-2 bg-gray-800 border border-gray-600 rounded-md p-2"
              />
              <input
                value={item.price}
                onChange={(e) => updateLine(item.id, { price: Number(e.target.value) })}
                type="number"
                min={0}
                step={0.01}
                className="col-span-3 bg-gray-800 border border-gray-600 rounded-md p-2"
              />
              <button
                onClick={() => removeLine(item.id)}
                className="col-span-1 text-xs text-red-300 hover:text-red-200"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addLine}
            className="text-sm text-blue-300 hover:text-blue-200"
            type="button"
          >
            + Add item
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span className="font-medium">Subtotal</span>
            <span className="font-medium">K {subtotal.toFixed(2)}</span>
          </div>

          {/* Tax Breakdown Section */}
          <div className="pl-4 border-l-2 border-gray-600 py-2 space-y-1">
             <h3 className="text-sm font-medium text-gray-400 mb-2">Tax Breakdown:</h3>
            {taxResult.taxBreakdown.map(tax => (
              <div key={tax.name} className="flex justify-between text-sm text-gray-300">
                <span>{tax.name}</span>
                <span>K {tax.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between text-xl font-bold pt-2">
            <span>Total Due</span>
            <span>K {taxResult.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
