"Refactor StockIssues.tsx to align with the new stock_issues database schema and professional restaurant requirements.

1. Data Structure Update:
Replace the old 'Transfer' fields (originItem, destinationItem, wasQty) with the new ledger fields: issue_type, qty_issued, unit_cost_at_time, and total_value_lost.

2. Modal/Form Adjustments:

Add a Select dropdown for issue_type with the options: 'Wastage', 'Expired', 'Staff Meal', 'Theft', and 'Damage'.

Add a Notes textarea. Use validation to make this field mandatory if the user selects 'Theft' or 'Damage'.

Add a 'Stock Preview' section that shows the item's current stock and what the stock will be after the adjustment is saved.

3. Table/List Display:

Update the table columns to show: Date, Item, Reason (Issue Type), Qty, Unit Cost, and Total Value Lost.

Ensure the total_value_lost is formatted as currency (the currency being used by the systme>.

4. Logic Integration:

Update the handleCreateIssue function to fetch the current unit_cost from stock_items before saving.

Ensure the submission calls my Supabase service to insert the new record and properly decrements the current_stock in the stock_items table.

Respect the existing unit_conversion logic if a user selects a non-base unit."