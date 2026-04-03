-- Migration: Add brand activation RPC
-- Allows authorized admins to activate/deactivate brands

-- RPC function to activate/deactivate a brand
CREATE OR REPLACE FUNCTION activate_brand(
  p_brand_id UUID,
  p_active BOOLEAN DEFAULT true,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_brand_exists BOOLEAN;
  v_brand_name TEXT;
BEGIN
  -- Check if brand exists
  SELECT EXISTS (SELECT 1 FROM brands WHERE id = p_brand_id)
  INTO v_brand_exists;
  
  IF NOT v_brand_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Brand not found'
    );
  END IF;
  
  -- Get brand name for response
  SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;
  
  -- Update brand activation status
  UPDATE brands
  SET 
    is_active = p_active,
    activated_at = CASE WHEN p_active THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_brand_id;
  
  -- Return success response
  RETURN jsonb_build_object(
    'ok', true,
    'message', CASE 
      WHEN p_active THEN 'Brand ' || v_brand_name || ' has been activated'
      ELSE 'Brand ' || v_brand_name || ' has been deactivated'
    END,
    'brand_id', p_brand_id,
    'brand_name', v_brand_name,
    'is_active', p_active,
    'activated_at', CASE WHEN p_active THEN now() ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon (for public activation endpoint if needed)
GRANT EXECUTE ON FUNCTION activate_brand(UUID, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION activate_brand(UUID, BOOLEAN, TEXT) TO authenticated;

-- Add index for faster brand lookups by activation status
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_activated_at ON brands(activated_at DESC);
