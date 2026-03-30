CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_brand_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  total_revenue numeric := 0;
  order_count integer := 0;
  total_expenses numeric := 0;
  low_stock_count integer := 0;
  top_selling jsonb := '[]'::jsonb;
  staff_performance jsonb := '[]'::jsonb;
  start_ts timestamp := (p_start_date::text || ' 00:00:00')::timestamp;
  end_ts timestamp := (p_end_date::text || ' 23:59:59')::timestamp;
BEGIN
  -- 1. Totals (Revenue and Order Count)
  SELECT coalesce(sum(total), 0), coalesce(count(*), 0)
  INTO total_revenue, order_count
  FROM public.pos_orders
  WHERE brand_id = p_brand_id 
    AND status = 'paid' 
    AND (paid_at >= start_ts AND paid_at <= end_ts);

  -- 2. Total Expenses
  SELECT coalesce(sum(amount), 0) INTO total_expenses
  FROM public.expenses
  WHERE brand_id = p_brand_id AND date >= p_start_date AND date <= p_end_date;

  -- 3. Low Stock Item Count
  SELECT coalesce(count(*), 0) INTO low_stock_count
  FROM public.stock_items
  WHERE brand_id = p_brand_id AND coalesce(current_stock, 0) <= coalesce(reorder_level, 0);

  -- 4. Top Selling Items (Joining with order items)
  WITH items AS (
    SELECT oi.menu_item_name AS name, sum(oi.total) AS sales, sum(oi.quantity) AS qty
    FROM public.pos_order_items oi
    JOIN public.pos_orders o ON o.id = oi.order_id
    WHERE o.brand_id = p_brand_id 
      AND o.status = 'paid' 
      AND o.paid_at >= start_ts AND o.paid_at <= end_ts
    GROUP BY oi.menu_item_name
    ORDER BY sales DESC LIMIT 5
  )
  SELECT jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'sales', sales))
  INTO top_selling FROM items;

  -- 5. Staff Performance (Using staff_name from your pos_orders schema)
  WITH staff AS (
    SELECT o.staff_name AS name, sum(o.total) AS totalSales
    FROM public.pos_orders o
    WHERE o.brand_id = p_brand_id 
      AND o.status = 'paid' 
      AND o.paid_at >= start_ts AND o.paid_at <= end_ts
    GROUP BY o.staff_name
    ORDER BY totalSales DESC
  )
  SELECT jsonb_agg(jsonb_build_object('name', coalesce(name, 'Unknown'), 'totalSales', totalSales))
  INTO staff_performance FROM staff;

  RETURN jsonb_build_object(
    'total_revenue', total_revenue,
    'order_count', order_count,
    'total_expenses', total_expenses,
    'low_stock_count', low_stock_count,
    'top_selling', coalesce(top_selling, '[]'::jsonb),
    'staff_performance', coalesce(staff_performance, '[]'::jsonb)
  );
END;
$$;