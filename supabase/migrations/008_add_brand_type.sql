-- Add brand_type to brands
alter table public.brands
add column if not exists brand_type text not null default 'restaurant';

-- Backfill any existing rows that may have business_type metadata
-- (optional) if you use business_type in older migrations, copy it over
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='business_type') THEN
    UPDATE public.brands SET brand_type = coalesce(brand_type, business_type);
  END IF;
END$$;
