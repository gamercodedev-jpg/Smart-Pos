-- 007_drop_staff_trigger.sql
-- Remove auth -> staff trigger and its function. Use when staff rows
-- will be created/managed from the application instead of a DB trigger.

BEGIN;

-- Drop the trigger attached to auth.users if it exists
DROP TRIGGER IF EXISTS create_staff_after_auth_insert ON auth.users;

-- Drop the helper function if it exists
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

COMMIT;
