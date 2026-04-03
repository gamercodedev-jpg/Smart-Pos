-- Migration: Enable real-time for brands table
-- Allows clients to subscribe to real-time changes on brand activation status

-- Enable realtime for brands table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE brands;

-- Ensure RLS is enabled on brands table for security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing authenticated users to read their own brand
CREATE POLICY "Users can read their own brand"
  ON brands
  FOR SELECT
  USING (
    -- Allow if the user is part of staff for this brand
    id IN (
      SELECT brand_id FROM staff 
      WHERE staff.user_id = auth.uid() OR staff.id = auth.uid()
    )
  );

-- Create a policy allowing owners to update their brand
CREATE POLICY "Brand owners can update their brand"
  ON brands
  FOR UPDATE
  USING (
    -- Allow if the user is the owner or admin of the brand
    id IN (
      SELECT brand_id FROM staff 
      WHERE (staff.user_id = auth.uid() OR staff.id = auth.uid())
      AND (role = 'owner' OR role = 'manager')
    )
  );

-- Comment for clarity
COMMENT ON TABLE brands IS 'Multi-tenant brands table with real-time synchronization enabled for activation status monitoring';
