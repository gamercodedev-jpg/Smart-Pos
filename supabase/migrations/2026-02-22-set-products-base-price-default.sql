-- Backfill and set default for products.base_price to avoid NOT NULL insert errors
BEGIN;

-- Set any existing NULLs to 0
UPDATE public.products SET base_price = 0 WHERE base_price IS NULL;

-- Set default to 0 for new rows
ALTER TABLE public.products ALTER COLUMN base_price SET DEFAULT 0;

-- Ensure column is NOT NULL for schema consistency
ALTER TABLE public.products ALTER COLUMN base_price SET NOT NULL;

COMMIT;

-- Note: Run this in Supabase SQL editor using a migration-capable role.
