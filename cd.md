 "Conversion Logic" to "Base Unit Logic." This means your database will store everything in the smallest unit (grams/milliliters), and the code will simply subtract the numbers without needing to divide by 1000 every time.

### The Master Prompt for Copilot

Copy and paste this entire block:

> "I am switching to a **Base Unit System (Option B)** for inventory. This means all items in `stock_items` will now be stored in their smallest unit (e.g., Flour will be stored as **10000** for grams, and Milk as **5000** for milliliters).
> Please perform the following three tasks:
> 1. **Simplify the `handle_stock_deductions` RPC**: Remove all conversion math (no more dividing by 1000). The function should now simply take the `qty` from the recipe and subtract it directly from the `current_stock`. It should still perform an atomic check: if `current_stock < qty`, return the 'insufficient stock' error.
> 2. **Update `POSTerminal.tsx**`: Ensure the frontend is no longer trying to perform its own conversions before calling the RPC. It should send the `qty` exactly as defined in the recipe (e.g., 250 for grams).
> 3. **Format Dashboard Display**: Since the database now stores large numbers like '10000', update the stock display component so that if an item is in grams ('g') and the value is  1000, it displays as **'10.00 KG'** on the screen for better readability, but the underlying data remains in grams.
> 
> 
> **Database Note**: In my `stock_items` table, the unit column is named `unit`. When comparing units, always use `LOWER(TRIM())` to avoid casing issues like 'KG' vs 'kg'."

---

### Why this solves all your issues at once:

* **The "Low Stock" Alert**: By storing 10,000 in the database, the system will finally see that . The alert will stop appearing because the numbers are now on the same scale.
* **Math Reliability**: Subtraction () is much more reliable in a database than division-based conversions which can suffer from rounding or casing errors.
* **User Experience**: You still see "10.00 KG" on your screen, so the system feels the same to you, but the "brain" underneath is much faster and smarter.

**Before you run the new code, have you run the SQL command to multiply your current stock by 1000 in Supabase? (e.g., turning that 10 into 10000?)**