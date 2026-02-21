-- Ensure `code` column exists on products and unique index on code
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='code') THEN
    ALTER TABLE public.products ADD COLUMN code TEXT;
  END IF;

  -- Ensure unique index on code when not null
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'products' AND indexname = 'products_code_ux') THEN
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS products_code_ux ON public.products USING btree (code) WHERE (code IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'add-code-to-products migration encountered an issue: %', SQLERRM;
END$$;
