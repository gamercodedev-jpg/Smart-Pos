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
  -- Convert incoming JSON array into rows; we treat the provided `qty` as
  -- already expressed in the stock base unit (post-backfill). This keeps the
  -- function unit-blind and avoids runtime conversions.
  WITH ded AS (
    SELECT
      COALESCE(NULLIF(trim(both from (d->>'itemId')), ''), NULLIF(trim(both from (d->>'stock_item_id')), ''))::uuid AS item_id,
      (d->>'qty')::numeric AS qty
    FROM json_array_elements(p_deductions) AS d
  ),
  -- lock matching stock rows and treat incoming qty as effective qty
  locked AS (
    SELECT
      s.id,
      s.current_stock,
      s.cost_per_unit,
      d.qty AS eff_qty
    FROM ded d
    JOIN public.stock_items s ON s.id = d.item_id
    FOR UPDATE
  ),
  insufficient AS (
    SELECT id AS item_id, eff_qty AS required_qty, current_stock AS on_hand_qty FROM locked WHERE current_stock < eff_qty
  )
  -- Aggregate insufficient rows here so the CTE stays in scope for both
  -- the count check and the json result.
  SELECT count(*), json_agg(json_build_object('itemId', item_id::text, 'requiredQty', required_qty, 'onHandQty', on_hand_qty))
  INTO insuff_count, res
  FROM insufficient;

  IF insuff_count > 0 THEN
    RETURN json_build_object('ok', false, 'insufficient', COALESCE(res, '[]'::json));
  END IF;

  -- Apply updates and insert ledger entries atomically using effective qtys.
  -- We re-derive the deduction rows from the incoming JSON here so we do
  -- not rely on the earlier `locked` CTE which is out of scope after the
  -- previous SELECT/RETURN. This keeps the update/ledger phase atomic.
  WITH ded2 AS (
    SELECT
      COALESCE(NULLIF(trim(both from (d->>'itemId')), ''), NULLIF(trim(both from (d->>'stock_item_id')), ''))::uuid AS item_id,
      (d->>'qty')::numeric AS qty
    FROM json_array_elements(p_deductions) AS d
  ), updated AS (
    UPDATE public.stock_items s
    SET current_stock = s.current_stock - d.qty
    FROM ded2 d
    WHERE s.id = d.item_id
    RETURNING s.id, s.current_stock, d.qty AS eff_qty
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
