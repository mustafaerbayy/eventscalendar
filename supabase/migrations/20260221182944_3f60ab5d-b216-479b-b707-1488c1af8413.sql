
-- Table to store announcement emails
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Table to store individual recipient logs
CREATE TABLE public.announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcement recipients"
ON public.announcement_recipients
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_announcement_recipients_announcement ON public.announcement_recipients(announcement_id);
