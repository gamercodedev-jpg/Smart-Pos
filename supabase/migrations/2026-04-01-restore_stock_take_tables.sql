-- Migration: Restore stock_takes and stock_take_items tables
-- Date: 2026-04-01

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid,
  take_no text,
  date date,
  created_by uuid,
  status text DEFAULT 'pending',
  notes text,
  total_variance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_takes_brand_date ON public.stock_takes(brand_id, date);

CREATE TABLE IF NOT EXISTS public.stock_take_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  system_qty numeric DEFAULT 0,
  counted_qty numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_value numeric DEFAULT 0
);

COMMIT;
