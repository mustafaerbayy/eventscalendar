
-- Add is_archived column to weekly_reports
ALTER TABLE public.weekly_reports ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Update the SELECT policy for weekly_reports
-- First, drop the old policy
DROP POLICY IF EXISTS "Reports are publicly readable" ON public.weekly_reports;

-- Create the new policy
-- Normal users can only see non-archived reports
-- Admins and Report Admins can see all reports (including archived)
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
