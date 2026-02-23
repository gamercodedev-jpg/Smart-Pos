"I am rebuilding my POS deduction logic to be 'Unit-Blind.'

Assumption: Both stock_items.current_stock and manufacturing_recipe_ingredients.quantity_used are already stored in their highest base units (Liters, KG, etc.).

Task: Update the applyRecipeDeductionsOrThrow function in POSTerminal.tsx.

Logic: It must loop through order items, find the matching recipe, and calculate the total required amount by simply multiplying ing.requiredQty by orderItem.quantity.

No Conversions: Do not divide by 1000 for 'ml' or 'g'. The database values are already pre-normalized."