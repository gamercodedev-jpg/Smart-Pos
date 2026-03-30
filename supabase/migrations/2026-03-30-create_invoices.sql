-- Migration: Create invoices table
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  order_id uuid,
  invoice_number text NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Optionally, add references to orders or customers if needed
  -- customer_id uuid,
  -- FOREIGN KEY (order_id) REFERENCES public.pos_orders(id)
  -- FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- Index for fast queries by brand and date
CREATE INDEX IF NOT EXISTS idx_invoices_brand_issued_at ON public.invoices(brand_id, issued_at);
