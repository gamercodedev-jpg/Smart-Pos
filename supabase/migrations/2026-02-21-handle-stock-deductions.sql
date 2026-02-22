-- Migration: create RPC to atomically apply stock deductions for recipes
-- Creates function: public.handle_stock_deductions(json)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atomic deduction function
CREATE OR REPLACE FUNCTION public.handle_stock_deductions(p_deductions json)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  res json;
  insuff_count int;
BEGIN
  -- Convert incoming JSON array into rows; allow optional 'unit' per element
  WITH ded AS (
    SELECT
      (d->>'itemId')::uuid AS item_id,
      (d->>'qty')::numeric AS qty,
      NULLIF(trim(both from (d->>'unit')), '') AS provided_unit
    FROM json_array_elements(p_deductions) AS d
  ),
  -- attach a fallback unit from any manufacturing_recipe_ingredients row for this stock item (if present)
  ded_with_unit AS (
    SELECT
      ded.item_id,
      ded.qty,
      COALESCE(ded.provided_unit,
        (SELECT unit FROM public.manufacturing_recipe_ingredients mri WHERE mri.stock_item_id = ded.item_id LIMIT 1)
      )::text AS unit_text
    FROM ded
  ),
  -- lock matching stock rows and compute an effective quantity in the stock's base unit
  locked AS (
    SELECT
      s.id,
      s.current_stock,
      s.cost_per_unit,
      d.qty,
      d.unit_text,
      -- compute effective deduction quantity based on ingredient/unit and stock unit type
      CASE
        -- Normalize both sides to lowercase and remove hidden spaces
        WHEN LOWER(TRIM(d.unit_text)) = 'g' AND LOWER(TRIM(s.unit)) = 'kg' THEN (d.qty / 1000.0)
        -- Add the same logic for liters if you use ML
        WHEN LOWER(TRIM(d.unit_text)) = 'ml' AND LOWER(TRIM(s.unit)) IN ('l','ltr','ltrs') THEN (d.qty / 1000.0)
        ELSE d.qty
      END AS eff_qty
    FROM ded_with_unit d
    JOIN public.stock_items s ON s.id = d.item_id
    FOR UPDATE
  ),
  insufficient AS (
    SELECT id AS item_id, eff_qty AS required_qty, current_stock AS on_hand_qty FROM locked WHERE current_stock < eff_qty
  )
  SELECT count(*) INTO insuff_count FROM insufficient;

  IF insuff_count > 0 THEN
    SELECT json_agg(json_build_object('itemId', item_id::text, 'requiredQty', required_qty, 'onHandQty', on_hand_qty)) INTO res FROM insufficient;
    RETURN json_build_object('ok', false, 'insufficient', COALESCE(res, '[]'::json));
  END IF;

  -- Apply updates and insert ledger entries atomically using effective qtys
  WITH updated AS (
    UPDATE public.stock_items s
    SET current_stock = s.current_stock - l.eff_qty
    FROM locked l
    WHERE s.id = l.id
    RETURNING s.id, s.current_stock, l.eff_qty
  ), ledger AS (
    INSERT INTO public.stock_ledger(id, stock_item_id, change_amount, entry_type, reason, created_at)
    SELECT gen_random_uuid(), id, -eff_qty, 'SALE', 'auto deduction', now() FROM updated
    RETURNING stock_item_id
  )
  SELECT json_build_object('ok', true, 'results', json_agg(json_build_object('itemId', u.id::text, 'before', (u.current_stock + u.eff_qty)::numeric, 'after', u.current_stock, 'unitCost', COALESCE(NULLIF(u.eff_qty,0),0))))
  INTO res
  FROM updated u;

  RETURN COALESCE(res, json_build_object('ok', true, 'results', '[]'::json));
END;
$$;
-- Allow the anon role to call this RPC (adjust role if you use a different unauthenticated role)
GRANT EXECUTE ON FUNCTION public.handle_stock_deductions(json) TO anon;
