-- Add storage-aware image column and ensure description optional
-- Idempotent migration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='image_storage_path') THEN
        ALTER TABLE public.products ADD COLUMN image_storage_path TEXT;
    END IF;

    -- Ensure description column exists (optional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='description') THEN
        ALTER TABLE public.products ADD COLUMN description TEXT;
    END IF;

    -- Ensure base_price has a sensible default and is NOT NULL
    BEGIN
        UPDATE public.products SET base_price = 0 WHERE base_price IS NULL;
    EXCEPTION WHEN OTHERS THEN
        -- ignore
    END;

    ALTER TABLE public.products ALTER COLUMN base_price SET DEFAULT 0;
    ALTER TABLE public.products ALTER COLUMN base_price SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- noop for safety in environments where public.products doesn't exist yet
    RAISE NOTICE 'alter-products migration encountered an issue: %', SQLERRM;
END$$;
