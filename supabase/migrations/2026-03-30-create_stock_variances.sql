-- Migration: Create stock_variances table
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS public.stock_variances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  item_name text NOT NULL,
  variance_qty numeric NOT NULL,
  variance_value numeric NOT NULL,
  count_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Optionally, add references to stock_items or users if needed
  -- item_id uuid,
  -- user_id uuid
  -- FOREIGN KEY (item_id) REFERENCES public.stock_items(id)
  -- FOREIGN KEY (user_id) REFERENCES public.users(id)
  CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- Index for fast queries by brand and date
CREATE INDEX IF NOT EXISTS idx_stock_variances_brand_date ON public.stock_variances(brand_id, count_date);
