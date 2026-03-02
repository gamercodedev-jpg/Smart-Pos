-- Create row-level security policies for the `branding-logos` storage bucket
-- Allows authenticated users to upload, update, delete, and read objects in this bucket.

-- Ensure RLS is enabled on storage.objects (Supabase typically already enables this)
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT objects into the branding-logos bucket
CREATE POLICY IF NOT EXISTS allow_insert_branding_logos ON storage.objects
  FOR INSERT
  USING (bucket_id = 'branding-logos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'branding-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to SELECT objects from the branding-logos bucket
CREATE POLICY IF NOT EXISTS allow_select_branding_logos ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding-logos');

-- Allow authenticated users to UPDATE objects in the branding-logos bucket
CREATE POLICY IF NOT EXISTS allow_update_branding_logos ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'branding-logos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'branding-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to DELETE objects from the branding-logos bucket
CREATE POLICY IF NOT EXISTS allow_delete_branding_logos ON storage.objects
  FOR DELETE
  USING (bucket_id = 'branding-logos' AND auth.role() = 'authenticated');

-- Notes:
-- - Run this migration against your Supabase project's database (SQL Editor or via CLI).
-- - Adjust the policy expressions if you need stricter ownership checks (e.g. store uploader uid in metadata and compare to auth.uid()).
