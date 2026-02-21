-- Create categories table if it doesn't exist and copy rows from departments
BEGIN;

-- Ensure `categories` exists in the public schema
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY,
  name text
);

-- Copy rows from departments into categories without duplicating existing ids
INSERT INTO public.categories (id, name)
SELECT d.id, d.name
FROM public.departments d
WHERE d.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.id = d.id
  );

COMMIT;
