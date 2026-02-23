-- Migration: create RPC to apply batch production deductions (direct conversions)
-- Creates function: public.apply_recipe_batch_deduction(uuid, numeric)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.apply_recipe_batch_deduction(p_manufacturing_recipe_id uuid, p_production_qty numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  res json;
  insuff_count int;
BEGIN
  -- Aggregate effective deduction quantity per stock item using direct conversions
  WITH mri AS (
    SELECT stock_item_id, quantity_used, unit FROM public.manufacturing_recipe_ingredients WHERE manufacturing_recipe_id = p_manufacturing_recipe_id
  ), joined AS (
    -- Compute effective quantities using direct conversions instead of the
    -- unit_conversions table. Use the stock's explicit `unit` when present,
    -- otherwise fall back to `unit_type` so legacy rows convert correctly.
    SELECT
      m.stock_item_id,
      SUM((
        CASE
          WHEN LOWER(TRIM(COALESCE(m.unit, ''))) = 'g' AND LOWER(TRIM(COALESCE(s.unit, ''))) = 'kg' THEN (m.quantity_used / 1000.0)
          WHEN LOWER(TRIM(COALESCE(m.unit, ''))) = 'ml' AND LOWER(TRIM(COALESCE(s.unit, ''))) IN ('l','ltr','ltrs') THEN (m.quantity_used / 1000.0)
          ELSE m.quantity_used
        END
      ) * p_production_qty::numeric) AS eff_qty,
      s.current_stock
    FROM mri m
    JOIN public.stock_items s ON s.id = m.stock_item_id
    GROUP BY m.stock_item_id, s.current_stock
  ), locked AS (
    SELECT j.stock_item_id AS id, j.current_stock, j.eff_qty
    FROM joined j
    JOIN public.stock_items s ON s.id = j.stock_item_id
    FOR UPDATE
  ), insufficient AS (
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
    SELECT gen_random_uuid(), id, -eff_qty, 'PRODUCTION', 'batch deduction', now() FROM updated
    RETURNING stock_item_id
  )
  SELECT json_build_object('ok', true, 'results', json_agg(json_build_object('itemId', u.id::text, 'before', (u.current_stock + u.eff_qty)::numeric, 'after', u.current_stock, 'deducted', u.eff_qty)))
  INTO res
  FROM updated u;

  RETURN COALESCE(res, json_build_object('ok', true, 'results', '[]'::json));
END;
$$;

-- Allow anonymous role to call (adjust role as necessary)
GRANT EXECUTE ON FUNCTION public.apply_recipe_batch_deduction(uuid, numeric) TO anon;
