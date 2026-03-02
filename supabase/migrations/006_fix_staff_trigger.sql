-- 006_fix_staff_trigger.sql
-- Robust trigger: safely create a staff row after an auth user is created.
-- Drops any old trigger/function with the same names then creates defensive function
-- that tolerates missing columns/metadata and will not cause auth signup to fail.

BEGIN;

-- remove prior trigger/function if present
DROP TRIGGER IF EXISTS create_staff_after_auth_insert ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only care about inserts
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.staff (user_id, email, full_name, role, brand_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NULLIF( (CASE WHEN NEW.user_metadata IS NOT NULL THEN (NEW.user_metadata->> 'full_name') END), '' ),
        NULLIF( (CASE WHEN NEW.raw_user_meta_data IS NOT NULL THEN (NEW.raw_user_meta_data->> 'full_name') END), '' ),
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      'staff',
      NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Ignore duplicates
    NULL;
  WHEN OTHERS THEN
    -- Swallow unexpected errors to avoid failing the auth signup flow.
    RAISE NOTICE 'handle_new_auth_user swallowed error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users after insert
CREATE TRIGGER create_staff_after_auth_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
