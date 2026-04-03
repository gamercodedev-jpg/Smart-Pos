-- Migration: Add brand activation fields
-- Allows tracking brand activation status and contact info for support

ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS activation_phone text DEFAULT '0970105334';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS activation_email text DEFAULT 'kulturesik30@gmail.com';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Create an index for faster active brand lookups
CREATE INDEX IF NOT EXISTS idx_brands_is_active_created_at ON brands(is_active, created_at DESC);

-- Add a check to ensure is_active is not null
ALTER TABLE brands ADD CONSTRAINT brands_is_active_not_null CHECK (is_active IS NOT NULL);
