-- Migration: create product-level RPC to atomically apply recipe deductions
-- Creates function: public.handle_stock_deduction(uuid, numeric)

-- This function finds the manufacturing recipe for the given product (by product_id
-- or by product.code) and builds a JSON array of ingredient deductions which it
-- forwards to `public.handle_stock_deductions(json)` so the actual update/ledger
-- insertion is performed atomically.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.handle_stock_deduction(p_product_id uuid, p_quantity numeric DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  recipe_id uuid;
  prod_code text;
  deductions json;
BEGIN
  -- Try to find recipe linked directly by product_id
  SELECT id INTO recipe_id FROM public.manufacturing_recipes WHERE product_id = p_product_id LIMIT 1;

  -- If no direct product_id link, try matching by product.code -> manufacturing_recipes.product_code
  IF recipe_id IS NULL THEN
    SELECT code INTO prod_code FROM public.products WHERE id = p_product_id LIMIT 1;
    IF prod_code IS NOT NULL THEN
      SELECT id INTO recipe_id FROM public.manufacturing_recipes WHERE product_code = prod_code LIMIT 1;
    END IF;
  END IF;

  IF recipe_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'no_recipe_found', 'product_id', p_product_id::text);
  END IF;

  -- Build JSON array of deductions: each ingredient quantity multiplied by p_quantity
  SELECT json_agg(json_build_object('itemId', mri.stock_item_id::text, 'qty', (mri.quantity_used::numeric * p_quantity)))
  INTO deductions
  FROM public.manufacturing_recipe_ingredients mri
  WHERE mri.manufacturing_recipe_id = recipe_id;

  IF deductions IS NULL OR deductions::jsonb = '[]'::jsonb THEN
    RETURN json_build_object('ok', false, 'error', 'no_ingredients', 'recipe_id', recipe_id::text);
  END IF;

  -- Delegate to the array RPC which performs locking, validation and ledger insertion
  RETURN public.handle_stock_deductions(deductions);
END;
$$;

-- Allow the anon role to call this product-level RPC (adjust if you use a different unauthenticated role)
GRANT EXECUTE ON FUNCTION public.handle_stock_deduction(uuid, numeric) TO anon;
