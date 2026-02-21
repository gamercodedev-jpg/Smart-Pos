-- Drop image_url column from products; storage path will be used instead
-- Idempotent: safe to run multiple times
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='image_url') THEN
    ALTER TABLE public.products DROP COLUMN IF EXISTS image_url;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'drop-image-url migration encountered an issue: %', SQLERRM;
END$$;
