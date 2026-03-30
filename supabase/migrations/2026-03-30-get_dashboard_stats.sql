-- Migration: create get_dashboard_stats RPC
-- Returns a jsonb snapshot with high-level aggregates for the dashboard

create or replace function public.get_dashboard_stats(
  p_brand_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
as $$
declare
  total_revenue numeric := 0;
  order_count integer := 0;
  total_expenses numeric := 0;
  low_stock_count integer := 0;
  top_selling jsonb := '[]'::jsonb;
  start_ts timestamp := (p_start_date::text || 'T00:00:00')::timestamp;
  end_ts timestamp := (p_end_date::text || 'T23:59:59')::timestamp;
begin
  -- Total revenue and order count from paid orders
  select coalesce(sum(total),0), coalesce(count(*),0)
  into total_revenue, order_count
  from public.pos_orders
  where brand_id = p_brand_id and status = 'paid' and paid_at >= start_ts and paid_at <= end_ts;

  -- Total expenses
  select coalesce(sum(amount),0) into total_expenses
  from public.expenses
  where brand_id = p_brand_id and date >= p_start_date and date <= p_end_date;

  -- Low stock items (arbitrary threshold: current_stock <= reorder_level)
  select coalesce(count(*),0) into low_stock_count
  from public.stock_items
  where brand_id = p_brand_id and coalesce(current_stock,0) <= coalesce(reorder_level,0);

  -- Top selling items by sales amount within range
  with items as (
    select oi.menu_item_id, oi.menu_item_name, sum(coalesce(oi.total,0)) as sales, sum(coalesce(oi.quantity,0)) as qty
    from public.pos_order_items oi
    join public.pos_orders o on o.id = oi.order_id
    where o.brand_id = p_brand_id and o.status = 'paid' and o.paid_at >= start_ts and o.paid_at <= end_ts
    group by oi.menu_item_id, oi.menu_item_name
    order by sales desc
    limit 5
  )
  select jsonb_agg(jsonb_build_object('itemId', coalesce(menu_item_id,'') , 'name', coalesce(menu_item_name,''), 'qty', qty, 'sales', sales))
  into top_selling
  from items;

  return jsonb_build_object(
    'reportDate', to_char(p_end_date, 'YYYY-MM-DD'),
    'total_revenue', round(total_revenue::numeric,2),
    'order_count', order_count,
    'total_expenses', round(total_expenses::numeric,2),
    'low_stock_count', low_stock_count,
    'top_selling_items', coalesce(top_selling, '[]'::jsonb),
    'last_updated', now()
  );
end;
$$;

comment on function public.get_dashboard_stats is 'Returns dashboard aggregates as jsonb: total_revenue, order_count, total_expenses, low_stock_count, top_selling_items, last_updated';
