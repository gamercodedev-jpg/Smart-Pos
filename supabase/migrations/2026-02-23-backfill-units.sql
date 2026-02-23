-- Migration: backfill legacy 'g'/'ml' units to 'kg'/'l'
-- Converts numeric quantities (divide by 1000) and updates textual unit fields.

BEGIN;

-- Preview counts (for operator verification)
-- SELECT count(*) FROM public.manufacturing_recipe_ingredients WHERE LOWER(TRIM(unit)) IN ('g','gram','grams','ml','milliliter','milliliters');

-- Convert recipe ingredient grams -> kilograms
UPDATE public.manufacturing_recipe_ingredients
SET quantity_used = quantity_used / 1000.0,
    unit = 'kg'
WHERE quantity_used IS NOT NULL
  AND LOWER(TRIM(unit)) IN ('g','gram','grams');

-- Convert recipe ingredient milliliters -> liters
UPDATE public.manufacturing_recipe_ingredients
SET quantity_used = quantity_used / 1000.0,
    unit = 'l'
WHERE quantity_used IS NOT NULL
  AND LOWER(TRIM(unit)) IN ('ml','milliliter','milliliters','millilitre','millilitres');

-- Convert stock items grams -> kilograms
UPDATE public.stock_items
SET current_stock = current_stock / 1000.0,
    unit = 'kg'
WHERE current_stock IS NOT NULL
  AND LOWER(TRIM(unit)) IN ('g','gram','grams');

-- Convert stock items milliliters -> liters
UPDATE public.stock_items
SET current_stock = current_stock / 1000.0,
    unit = 'l'
WHERE current_stock IS NOT NULL
  AND LOWER(TRIM(unit)) IN ('ml','milliliter','milliliters','millilitre','millilitres');

COMMIT;

-- Note: run this migration in a safe environment and verify counts before/after.
