-- Idempotent migration: create clean manufacturing recipe tables
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
  finished_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ingredients table linking manufacturing_recipes -> stock_items
CREATE TABLE IF NOT EXISTS public.manufacturing_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturing_recipe_id uuid NOT NULL REFERENCES public.manufacturing_recipes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  quantity_used numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes used by frontend upserts and lookups
CREATE UNIQUE INDEX IF NOT EXISTS uniq_manufacturing_recipes_product_code
  ON public.manufacturing_recipes (product_code)
  WHERE product_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_manufacturing_recipes_product_id
  ON public.manufacturing_recipes (product_id)
  WHERE product_id IS NOT NULL;

COMMIT;

-- Dev RLS helper (run only if you understand security implications):
-- ALTER TABLE public.manufacturing_recipes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY dev_all_manufacturing_recipes ON public.manufacturing_recipes FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE public.manufacturing_recipe_ingredients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY dev_all_manufacturing_recipe_ingredients ON public.manufacturing_recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
