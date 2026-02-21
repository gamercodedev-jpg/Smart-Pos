-- Add department_id and image_storage_path to products so it matches UI expectations
-- Idempotent: safe to run multiple times
DO $$
BEGIN
  -- Add department_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='department_id') THEN
    ALTER TABLE public.products ADD COLUMN department_id uuid;
  END IF;

  -- Add foreign key constraint to departments if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema='public' AND tc.table_name='products' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='department_id'
  ) THEN
    BEGIN
      ALTER TABLE public.products ADD CONSTRAINT products_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If departments table doesn't exist or constraint already present, ignore
      RAISE NOTICE 'Could not add products.department_id foreign key: %', SQLERRM;
    END;
  END IF;

  -- Add image_storage_path column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='image_storage_path') THEN
    ALTER TABLE public.products ADD COLUMN image_storage_path TEXT;
  END IF;

  -- Ensure base_price default and not null
  BEGIN
    UPDATE public.products SET base_price = 0 WHERE base_price IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- ignore
  END;
  ALTER TABLE public.products ALTER COLUMN base_price SET DEFAULT 0;
  ALTER TABLE public.products ALTER COLUMN base_price SET NOT NULL;

  -- Ensure code unique index exists
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'products' AND indexname = 'products_code_ux') THEN
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS products_code_ux ON public.products USING btree (code) WHERE (code IS NOT NULL);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'add-department-to-products migration encountered an issue: %', SQLERRM;
END$$;
