-- Migration: add read-only preview RPC for stock deductions
-- Creates function: public.preview_stock_deductions(json)

CREATE OR REPLACE FUNCTION public.preview_stock_deductions(p_deductions json)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  res json;
  insuff json;
BEGIN
  -- Parse incoming JSON array into rows
  WITH ded AS (
    SELECT
      COALESCE(NULLIF(trim(both from (d->>'itemId')), ''), NULLIF(trim(both from (d->>'stock_item_id')), ''))::uuid AS item_id,
      (d->>'qty')::numeric AS qty
    FROM json_array_elements(p_deductions) AS d
  ),
  -- Join to current stock rows and compute after values (read-only)
  joined AS (
    SELECT s.id, s.current_stock, d.qty, (s.current_stock - d.qty) AS after_qty
    FROM ded d
    JOIN public.stock_items s ON s.id = d.item_id
  )
  -- Aggregate preview results and collect any insufficient rows in one query
  SELECT
    json_build_object('ok', true, 'results', COALESCE(json_agg(json_build_object('itemId', id::text, 'before', current_stock, 'after', after_qty)), '[]'::json)) AS preview,
    json_agg(json_build_object('itemId', id::text, 'requiredQty', qty, 'onHandQty', current_stock)) FILTER (WHERE current_stock < qty) AS insuff
  INTO res, insuff
  FROM joined;

  IF insuff IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'insufficient', insuff, 'preview', COALESCE(res, json_build_object('ok', true, 'results', '[]'::json)));
  END IF;

  RETURN COALESCE(res, json_build_object('ok', true, 'results', '[]'::json));
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_stock_deductions(json) TO anon;
