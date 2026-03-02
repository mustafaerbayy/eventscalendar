-- Add archived_at column to announcements table for soft delete
ALTER TABLE public.announcements 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Update RLS policy to show only non-archived announcements
DROP POLICY "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
