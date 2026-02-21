-- Add table to store manufacturing recipe metadata (separate from ingredients join table)
-- Note: `recipes` table remains the ingredients join (product_id -> stock_item_id)
CREATE TABLE IF NOT EXISTS manufacturing_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text,
  code text,
  output_qty numeric DEFAULT 1,
  unit_type text DEFAULT 'EACH',
  finished_department_id uuid REFERENCES departments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id)
);

-- Trigger helper to keep `updated_at` current
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON manufacturing_recipes;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON manufacturing_recipes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
