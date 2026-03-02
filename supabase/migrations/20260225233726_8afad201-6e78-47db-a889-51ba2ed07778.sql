
-- Create weekly_reports table
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  content text,
  file_url text,
  file_type text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_or_file CHECK (content IS NOT NULL OR file_url IS NOT NULL)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Everyone can read reports
CREATE POLICY "Reports are publicly readable"
  ON public.weekly_reports FOR SELECT
  USING (true);

-- Report admins can insert
CREATE POLICY "Report admins can insert reports"
  ON public.weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'report_admin') OR public.has_role(auth.uid(), 'admin')
  );

-- Report admins can update their own reports, admins can update any
CREATE POLICY "Report admins can update own reports"
  ON public.weekly_reports FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'report_admin') AND created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

-- Report admins can delete their own reports, admins can delete any
CREATE POLICY "Report admins can delete own reports"
  ON public.weekly_reports FOR DELETE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'report_admin') AND created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

-- Create storage bucket for weekly reports
INSERT INTO storage.buckets (id, name, public) VALUES ('weekly-reports', 'weekly-reports', true);

-- Storage policies: anyone can read
CREATE POLICY "Anyone can read weekly report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'weekly-reports');

-- Report admins and admins can upload
CREATE POLICY "Report admins can upload weekly report files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'weekly-reports' AND (
      public.has_role(auth.uid(), 'report_admin') OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Report admins can delete their own files, admins can delete any
CREATE POLICY "Report admins can delete weekly report files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'weekly-reports' AND (
      public.has_role(auth.uid(), 'report_admin') OR public.has_role(auth.uid(), 'admin')
    )
  );
