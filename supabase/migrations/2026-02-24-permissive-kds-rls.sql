-- Permissive RLS + publication adjustments for Kitchen Display testing
-- WARNING: development-only. Tighten policies before production use.

-- Enable row level security
ALTER TABLE IF EXISTS public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_orders ENABLE ROW LEVEL SECURITY;

-- Create permissive policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_order_items' AND policyname = 'p_all_select_pos_order_items'
  ) THEN
    EXECUTE 'CREATE POLICY p_all_select_pos_order_items ON public.pos_order_items FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_order_items' AND policyname = 'p_all_modify_pos_order_items'
  ) THEN
    EXECUTE 'CREATE POLICY p_all_modify_pos_order_items ON public.pos_order_items FOR INSERT, UPDATE USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_orders' AND policyname = 'p_all_select_pos_orders'
  ) THEN
    EXECUTE 'CREATE POLICY p_all_select_pos_orders ON public.pos_orders FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_orders' AND policyname = 'p_all_modify_pos_orders'
  ) THEN
    EXECUTE 'CREATE POLICY p_all_modify_pos_orders ON public.pos_orders FOR INSERT, UPDATE USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'policy create error: %', SQLERRM;
END$$;

-- Ensure replica identity so updates/deletes are fully visible to replication
ALTER TABLE IF EXISTS public.pos_order_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.pos_orders REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_order_items, public.pos_orders';
    EXCEPTION WHEN duplicate_object THEN
      -- already present, ignore
      NULL;
    END;
  END IF;
END$$;

-- End of migration
