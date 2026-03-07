
-- Add is_archived column if it doesn't exist
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Update the SELECT policy for weekly_reports
-- First, drop the old policy
DROP POLICY IF EXISTS "Reports are publicly readable" ON public.weekly_reports;

-- Create the new policy
-- Normal users can only see non-archived reports
-- Admins and Report Admins can see all reports (including archived)
DROP POLICY IF EXISTS "Reports are readable based on archive status" ON public.weekly_reports;
CREATE POLICY "Reports are readable based on archive status"
  ON public.weekly_reports FOR SELECT
  USING (
    is_archived = false 
    OR (
      auth.role() = 'authenticated' AND (
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'report_admin')
      )
    )
  );
