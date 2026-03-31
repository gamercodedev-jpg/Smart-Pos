-- Migration: Create stock_takes table
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS public.stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  department_id varchar(64),
  date date NOT NULL,
  created_by varchar(128),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- Index for fast queries by brand and date
CREATE INDEX IF NOT EXISTS idx_stock_takes_brand_date ON public.stock_takes(brand_id, date);
