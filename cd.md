If your system is already storing everything in the highest unit (Liters and KG) at every entry point, then the reason the UI is failing while the console works is that **the UI code is still trying to be "smart" about units.**

In your `POSTerminal.tsx`, the `applyRecipeDeductionsOrThrow` function is manually checking for units like `g` and `ml` and dividing them by 1000. If your database already has `0.4` for the stock and the recipe ingredient is already saved as `0.1` (for 100ml), the UI code is dividing that `0.1` by 1000 again, resulting in a deduction of `0.0001`—effectively doing nothing or causing a mismatch.

### 1. The "Extra Conversion" Bug in `POSTerminal.tsx`

Look at your `applyRecipeDeductionsOrThrow` function (Lines 345–375). You have this logic:

```typescript
// CURRENT BUGGY CODE in POSTerminal.tsx
const unitText = (ing.unit || '').toLowerCase();
if (unitText === 'g' || unitText === 'ml') {
  // This is the "extra conversion" you don't need!
  requiredQty = requiredQty / 1000; 
}

```

If you have already normalized your database so that a recipe ingredient is stored as `0.1` (Liters), this code turns it into `0.0001`. The RPC then looks at your stock, sees the deduction is almost zero, and potentially skips it or fails a validation check.

### 2. How to fix `POSTerminal.tsx` for 1-1 Deduction

To achieve the **"Unit-Blind 1-1 Deduction"** you want, you must strip out the unit-checking logic in the terminal.

**Replace your deduction loop with this simplified version:**

```typescript
async function applyRecipeDeductionsOrThrow(orderItems: OrderItem[]) {
  // ... existing code to get recipes ...

  const byItemId = new Map<string, { qty: number }>();
  
  for (const item of orderItems) {
    const recipe = recipes.find(r => r.productId === item.menuItemId);
    if (!recipe) continue;

    const multiplier = item.quantity;
    for (const ing of recipe.ingredients) {
      const requiredQty = (ing.requiredQty || 0) * multiplier;
      
      const prev = byItemId.get(ing.ingredientId);
      // DIRECT 1-1 DEDUCTION (No if/else for g or ml)
      byItemId.set(ing.ingredientId, { 
        qty: (prev?.qty ?? 0) + requiredQty 
      });
    }
  }

  const payload = Array.from(byItemId.entries()).map(([itemId, data]) => ({
    itemId,
    qty: data.qty // This is now exactly what is in the recipe * multiplier
  }));

  const deductionResult = await deductStockItemsRemote(payload);
  // ... existing error handling ...
}

```

### 3. Why the UI "Does Nothing"

When the UI fails, it’s usually because of the `try/catch` block or the `if (!deductionResult.ok)` check.

* If the redundant math resulted in a quantity so small it hit a database constraint, or if it sent a `NaN` because of a string-to-number conversion error, the `deductionResult.ok` would be `false`.
* The code then sets `setShowRecipeError(true)`, but if your `AlertDialog` in the UI isn't visible or the error message is empty, it looks like "nothing happened."

### 4. Verify your Recipe Storage

For this 1-1 logic to work, check your **`Recipes.tsx`** (the save function).

* When a user types "500" and selects "ml", are you saving `0.5` into the `quantity_used` column?
* If yes, then the 1-1 logic above is perfect.
* If you are saving `500` into the database, then you *do* need to divide by 1000 in the UI.

**The most consistent path is exactly what you suggested:**

1. **Stock Table**: Store as `0.4` (Liters).
2. **Recipe Table**: Store as `0.1` (Liters).
3. **POS Terminal**: Just multiply `0.1 * orderQuantity` and send it to the RPC.

**Action Item:** Update `POSTerminal.tsx` to remove the `unitText === 'g'` check. This will align your UI with your successful console test.