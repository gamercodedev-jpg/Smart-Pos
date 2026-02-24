-- Add requires_preparation column to products used by POS
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS requires_preparation boolean NOT NULL DEFAULT false;

-- Backfill default false for any existing records if column created without default
UPDATE products SET requires_preparation = false WHERE requires_preparation IS NULL;
