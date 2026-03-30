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
  cashier_shift_count integer := 0;
  cashier_shift_closed_count integer := 0;
  cashier_shift_opening_total numeric := 0;
  cashier_shift_closing_total numeric := 0;
  cashier_shift_variance_total numeric := 0;
  cashier_shifts_by_staff jsonb := '[]'::jsonb;
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

  -- Shift Analytics (open + closed shifts in range)
  WITH shift_rows AS (
    SELECT
      cs.staff_id,
      coalesce(s.name, 'Unknown') AS staff_name,
      cs.opening_cash,
      cs.closing_cash,
      cs.closed_at IS NOT NULL AS is_closed,
      coalesce(cs.closing_cash, 0) AS safe_closing_cash,
      coalesce(cs.closing_cash, 0) - cs.opening_cash AS variance_amount
    FROM public.cashier_shifts cs
    LEFT JOIN public.under_brand_staff s ON s.id = cs.staff_id
    WHERE cs.brand_id = p_brand_id
      AND (
        (cs.opened_at >= start_ts AND cs.opened_at <= end_ts)
        OR (cs.closed_at IS NOT NULL AND cs.closed_at >= start_ts AND cs.closed_at <= end_ts)
      )
  ), staff_shift_agg AS (
    SELECT
      staff_id,
      staff_name,
      count(*) AS shifts,
      sum(CASE WHEN is_closed THEN 1 ELSE 0 END) AS closed_shifts,
      coalesce(sum(opening_cash), 0) AS opening_cash,
      coalesce(sum(safe_closing_cash), 0) AS closing_cash,
      coalesce(sum(variance_amount), 0) AS total_variance
    FROM shift_rows
    GROUP BY staff_id, staff_name
  )
  SELECT
    coalesce(sum(shifts), 0),
    coalesce(sum(closed_shifts), 0),
    coalesce(sum(opening_cash), 0),
    coalesce(sum(closing_cash), 0),
    coalesce(sum(total_variance), 0),
    coalesce(jsonb_agg(jsonb_build_object(
      'staff_id', staff_id,
      'staff_name', staff_name,
      'shifts', shifts,
      'closed_shifts', closed_shifts,
      'opening_cash', opening_cash,
      'closing_cash', closing_cash,
      'total_variance', total_variance
    )), '[]'::jsonb)
  INTO
    cashier_shift_count,
    cashier_shift_closed_count,
    cashier_shift_opening_total,
    cashier_shift_closing_total,
    cashier_shift_variance_total,
    cashier_shifts_by_staff
  FROM staff_shift_agg;

  RETURN jsonb_build_object(
    'total_revenue', total_revenue,
    'order_count', order_count,
    'total_expenses', total_expenses,
    'low_stock_count', low_stock_count,
    'top_selling', coalesce(top_selling, '[]'::jsonb),
    'staff_performance', coalesce(staff_performance, '[]'::jsonb),
    'cashier_shift_count', cashier_shift_count,
    'cashier_shift_closed_count', cashier_shift_closed_count,
    'cashier_shift_opening_total', cashier_shift_opening_total,
    'cashier_shift_closing_total', cashier_shift_closing_total,
    'cashier_shift_variance_total', cashier_shift_variance_total,
    'cashier_shifts_by_staff', cashier_shifts_by_staff
  );
END;
$$;