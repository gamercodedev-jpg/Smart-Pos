-- Migration: create per-item RPC to deduct ingredients for a sold menu item
-- Creates function: public.handle_order_stock_deduction(uuid, numeric)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.handle_order_stock_deduction(p_menu_item_id uuid, p_qty_sold numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delegate to existing product-level RPC if available
  RETURN public.handle_stock_deduction(p_menu_item_id, p_qty_sold);
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_order_stock_deduction(uuid, numeric) TO anon;
