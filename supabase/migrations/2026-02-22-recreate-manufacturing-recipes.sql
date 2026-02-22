-- Idempotent migration: recreate manufacturing recipe tables + legacy recipe join
-- Run this in the Supabase SQL editor (or via psql with a migration-capable user).
BEGIN;

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- manufacturing_recipes metadata table
CREATE TABLE IF NOT EXISTS public.manufacturing_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_code text,
  name text,
  code text,
  output_qty numeric DEFAULT 1,
  unit_type text DEFAULT 'EACH',
  finished_department_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ingredients table for product-less recipes
CREATE TABLE IF NOT EXISTS public.manufacturing_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturing_recipe_id uuid NOT NULL REFERENCES public.manufacturing_recipes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  quantity_used numeric DEFAULT 0,
  unit text DEFAULT 'each',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Legacy recipes join table mapping a product -> stock items (keeps compatibility)
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  quantity_used numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes used by frontend upserts
CREATE UNIQUE INDEX IF NOT EXISTS uniq_manufacturing_recipes_product_code
  ON public.manufacturing_recipes (product_code)
  WHERE product_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_manufacturing_recipes_product_id
  ON public.manufacturing_recipes (product_id)
  WHERE product_id IS NOT NULL;

COMMIT;

-- DEV: optional permissive RLS policies for development (run only if you understand security implications)
-- Uncomment and run the block below in development only.
--
-- ALTER TABLE public.manufacturing_recipes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY dev_all_manufacturing_recipes ON public.manufacturing_recipes FOR ALL USING (true) WITH CHECK (true);
--
-- ALTER TABLE public.manufacturing_recipe_ingredients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY dev_all_manufacturing_recipe_ingredients ON public.manufacturing_recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
