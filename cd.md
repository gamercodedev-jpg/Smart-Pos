"I need to refactor my Dashboard.tsx and its related stores (orderStore.ts, stockStore.ts, dashboardMetrics.ts) to be Real-Time and Server-Side Aggregated. Currently, the dashboard is stale because it relies on local storage and manual fetches that don't trigger when other devices make changes.

Please perform the following steps:

1. Database Layer (Postgres RPC)
Create a PostgreSQL function named get_dashboard_stats(p_brand_id uuid, p_start_date date, p_end_date date).

It should return a jsonb object containing: total_revenue, order_count, total_expenses, low_stock_count, and top_selling_items.

This ensures the database does the heavy math, preventing the browser from downloading thousands of rows just to show a single total.

2. Store Layer (Real-Time Subscription)
In orderStore.ts, stockStore.ts, and expenseStore.ts, implement a Supabase Realtime Channel.

Add a subscribeToChanges(brandId: string) function to each store.

Use supabase.channel().on('postgres_changes', ...) to listen for INSERT, UPDATE, or DELETE events filtered by brand_id.

When a change is detected, the listener must automatically trigger fetchFromDb() to refresh the local state and notify the Dashboard.

3. Metrics Refactor (dashboardMetrics.ts)
Refactor the metrics logic to prioritize the results from the new get_dashboard_stats RPC.

Ensure that the 'Today' calculation uses a standardized date format (YYYY-MM-DD) to avoid timezone discrepancies between the client and the database.

4. UI Layer (Dashboard.tsx)
In the useEffect hook, initialize the Real-Time subscriptions for all relevant stores when the component mounts.

Ensure proper cleanup (supabase.removeChannel) in the useEffect return.

Replace the local JS calculations for KPI cards with the data returned from the get_dashboard_stats RPC.

Add a 'Live' indicator or a 'Last Updated' timestamp to the UI so the user knows the data is syncing in real-time.

Goal: When I place an order on a phone, the Dashboard on my laptop must update the 'Total Revenue' card instantly without a manual refresh."