-- Add creator_name to store the name of the user who created the report
ALTER TABLE public.weekly_reports
ADD COLUMN creator_name text;

-- Temporarily allow row level security to select profiles for the backfill
-- Actually, since we are doing this in a migration (which runs as superuser/postgres role),
-- RLS policies are bypassed by default for the postgres role. We can just run the update.
UPDATE public.weekly_reports wr
SET creator_name = TRIM(CONCAT(p.first_name, ' ', p.last_name))
FROM public.profiles p
WHERE wr.created_by = p.id;

-- Fallback for any reports where profile was not found or name is empty
UPDATE public.weekly_reports
SET creator_name = 'Bilinmeyen Kullanıcı'
WHERE creator_name IS NULL OR creator_name = '';

-- Now that we have backfilled the data, drop the existing foreign key constraint from weekly_reports -> auth.users
ALTER TABLE public.weekly_reports
DROP CONSTRAINT weekly_reports_created_by_fkey;

-- Re-create the foreign key constraint with ON DELETE SET NULL instead of CASCADE
-- We also need to change the column to allow NULLs
ALTER TABLE public.weekly_reports
ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.weekly_reports
ADD CONSTRAINT weekly_reports_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Finally, make creator_name NOT NULL so future inserts must provide it
ALTER TABLE public.weekly_reports
ALTER COLUMN creator_name SET NOT NULL;
