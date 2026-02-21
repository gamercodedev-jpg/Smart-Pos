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
  -- Convert incoming JSON array into rows and lock matching stock rows
  WITH ded AS (
    SELECT (d->>'itemId')::uuid AS item_id, (d->>'qty')::numeric AS qty
    FROM json_array_elements(p_deductions) AS d
  ), locked AS (
    SELECT s.id, s.current_stock, s.cost_per_unit, ded.qty
    FROM ded
    JOIN public.stock_items s ON s.id = ded.item_id
    FOR UPDATE
  ), insufficient AS (
    SELECT id AS item_id, qty AS required_qty, current_stock AS on_hand_qty FROM locked WHERE current_stock < qty
  )
  SELECT count(*) INTO insuff_count FROM insufficient;

  IF insuff_count > 0 THEN
    SELECT json_agg(json_build_object('itemId', item_id::text, 'requiredQty', required_qty, 'onHandQty', on_hand_qty)) INTO res FROM insufficient;
    RETURN json_build_object('ok', false, 'insufficient', COALESCE(res, '[]'::json));
  END IF;

  -- Apply updates and insert ledger entries atomically
  WITH ded AS (
    SELECT (d->>'itemId')::uuid AS item_id, (d->>'qty')::numeric AS qty
    FROM json_array_elements(p_deductions) AS d
  ), updated AS (
    UPDATE public.stock_items s
    SET current_stock = s.current_stock - ded.qty
    FROM ded
    WHERE s.id = ded.item_id
    RETURNING s.id, s.current_stock, ded.qty
  ), ledger AS (
    INSERT INTO public.stock_ledger(id, stock_item_id, change_amount, entry_type, reason, created_at)
    SELECT gen_random_uuid(), id, -qty, 'SALE', 'auto deduction', now() FROM updated
    RETURNING stock_item_id
  )
  SELECT json_build_object('ok', true, 'results', json_agg(json_build_object('itemId', u.id::text, 'before', (u.current_stock + u.qty)::numeric, 'after', u.current_stock, 'unitCost', COALESCE(NULLIF(u.qty,0),0))))
  INTO res
  FROM updated u;

  RETURN COALESCE(res, json_build_object('ok', true, 'results', '[]'::json));
END;
$$;

-- Allow the anon role to call this RPC (adjust role if you use a different unauthenticated role)
GRANT EXECUTE ON FUNCTION public.handle_stock_deductions(json) TO anon;
