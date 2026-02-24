-- Migration: Enable RLS and create permissive SELECT policies for kitchen testing
-- WARNING: This grants read access to anon clients for these tables. Use only for testing.

BEGIN;

-- Enable row level security
ALTER TABLE IF EXISTS public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_order_items ENABLE ROW LEVEL SECURITY;

-- Permissive SELECT policies so realtime subscriptions can read rows
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'pos_orders' AND p.policyname = 'allow_public_select_pos_orders'
  ) THEN
    EXECUTE $$
      CREATE POLICY allow_public_select_pos_orders ON public.pos_orders
        FOR SELECT USING (true);
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'pos_order_items' AND p.policyname = 'allow_public_select_pos_order_items'
  ) THEN
    EXECUTE $$
      CREATE POLICY allow_public_select_pos_order_items ON public.pos_order_items
        FOR SELECT USING (true);
    $$;
  END IF;
END;
$do$;

COMMIT;
