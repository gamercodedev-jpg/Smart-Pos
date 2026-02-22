-- Allow manufacturing recipes to exist independently of products
-- Make product_id nullable and add a product_code for recipes created before product exists.
ALTER TABLE IF EXISTS manufacturing_recipes ALTER COLUMN product_id DROP NOT NULL;

-- Add an optional product_code to identify the recipe before a product row exists.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manufacturing_recipes' AND column_name='product_code') THEN
    ALTER TABLE manufacturing_recipes ADD COLUMN product_code text;
  END IF;
END $$;

-- Create a dedicated ingredients table for manufacturing recipes that links to manufacturing_recipes.id
CREATE TABLE IF NOT EXISTS manufacturing_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturing_recipe_id uuid NOT NULL REFERENCES manufacturing_recipes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  quantity_used numeric NOT NULL,
  unit text DEFAULT 'each',
  created_at timestamptz DEFAULT now()
);

-- Optional unique constraint on product_code when present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'manufacturing_recipes' AND indexname = 'manufacturing_recipes_product_code_ux') THEN
    CREATE UNIQUE INDEX manufacturing_recipes_product_code_ux ON manufacturing_recipes (product_code) WHERE product_code IS NOT NULL;
  END IF;
END $$;
