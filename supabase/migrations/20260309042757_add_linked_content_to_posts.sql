-- Add linked content fields to posts table
ALTER TABLE public.posts ADD COLUMN linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN linked_report_id UUID REFERENCES public.weekly_reports(id) ON DELETE SET NULL;
