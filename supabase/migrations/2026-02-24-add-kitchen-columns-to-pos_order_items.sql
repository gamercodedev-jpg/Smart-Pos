-- Add kitchen tracking columns to public.pos_order_items
ALTER TABLE IF EXISTS public.pos_order_items
ADD COLUMN IF NOT EXISTS kitchen_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kitchen_station_id text;

-- Refresh PostgREST schema cache so Supabase sees the new columns
NOTIFY pgrst, 'reload schema';
