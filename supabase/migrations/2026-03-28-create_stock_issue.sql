-- 2026-03-28-create_stock_issue.sql
-- Create stock_issues table to persist internal stock transfer lines (brand-scoped)
-- and a trigger/function to set defaults and maintain created_at.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stock_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,

  -- The stock item this issue applies to
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,

  -- Issue classification
  issue_type text NOT NULL CHECK (issue_type IN ('Wastage','Expired','Staff Meal','Theft','Damage')),

  qty_issued numeric(14,4) NOT NULL,
  unit_cost_at_time numeric(14,4) NOT NULL,
  total_value_lost numeric(18,4) NOT NULL,

  notes text,

  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_issues_brand_created_at ON public.stock_issues (brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_issues_item ON public.stock_issues (brand_id, stock_item_id);

-- Defaults function to set created_by and timestamps
-- Defaults function to set created_by and timestamps (and enforce notes for Theft/Damage)
CREATE OR REPLACE FUNCTION public.stock_issues_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    BEGIN
      NEW.created_by := auth.uid();
    EXCEPTION WHEN others THEN
      NEW.created_by := NULL;
    END;
  END IF;
  NEW.created_at := coalesce(NEW.created_at, now());

  -- Notes required for Theft or Damage
  IF (NEW.issue_type = 'Theft' OR NEW.issue_type = 'Damage') THEN
    IF NEW.notes IS NULL OR length(btrim(NEW.notes)) = 0 THEN
      RAISE EXCEPTION 'Notes are required for issue_type %', NEW.issue_type;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_issues_set_defaults ON public.stock_issues;
CREATE TRIGGER trg_stock_issues_set_defaults
BEFORE INSERT ON public.stock_issues
FOR EACH ROW
EXECUTE FUNCTION public.stock_issues_set_defaults();

-- Trigger to decrement current_stock on insert
CREATE OR REPLACE FUNCTION public.stock_issues_decrement_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- decrement the referenced stock_item current_stock by qty_issued
  UPDATE public.stock_items
  SET current_stock = current_stock - NEW.qty_issued,
      updated_at = now()
  WHERE id = NEW.stock_item_id AND brand_id = NEW.brand_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_issues_decrement_stock ON public.stock_issues;
CREATE TRIGGER trg_stock_issues_decrement_stock
AFTER INSERT ON public.stock_issues
FOR EACH ROW
EXECUTE FUNCTION public.stock_issues_decrement_stock();

-- Enable RLS and add conservative brand-scoped policies (adjust to your RBAC as needed)
ALTER TABLE IF EXISTS public.stock_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_issues_select_brand_owner" ON public.stock_issues;
CREATE POLICY "stock_issues_select_brand_owner" ON public.stock_issues
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "stock_issues_insert_brand_owner" ON public.stock_issues;
CREATE POLICY "stock_issues_insert_brand_owner" ON public.stock_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "stock_issues_update_brand_owner" ON public.stock_issues;
CREATE POLICY "stock_issues_update_brand_owner" ON public.stock_issues
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "stock_issues_delete_brand_owner" ON public.stock_issues;
CREATE POLICY "stock_issues_delete_brand_owner" ON public.stock_issues
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_id = auth.uid()
  ));

GRANT EXECUTE ON FUNCTION public.stock_issues_set_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stock_issues_decrement_stock() TO authenticated;

COMMIT;

-- Notes:
-- 1) This migration creates a `stock_issues` ledger table suitable for single-item issues.
-- 2) Columns include `issue_type`, `qty_issued`, `unit_cost_at_time`, `total_value_lost`,
--    and `notes`. Notes are required for 'Theft' and 'Damage' via the defaults trigger.
-- 3) The `stock_issues_decrement_stock` trigger decrements `stock_items.current_stock` on insert.
-- 4) Adjust RLS policies to permit brand staff members via your membership table instead
--    of only brand owner checks if required.
