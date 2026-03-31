-- Migration: Create stock_takes table (normalized)
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS public.stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NULL,
  take_no text NULL,
  date date NULL,
  created_by uuid NULL,
  status text NULL DEFAULT 'pending',
  notes text NULL,
  total_variance numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_takes_brand_date ON public.stock_takes(brand_id, date);
