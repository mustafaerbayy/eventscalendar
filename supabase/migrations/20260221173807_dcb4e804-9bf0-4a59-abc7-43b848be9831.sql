
-- Fix search_path on validate_rsvp function
CREATE OR REPLACE FUNCTION public.validate_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'not_attending' THEN
    NEW.guest_count := 0;
  END IF;
  IF NEW.guest_count < 0 THEN
    NEW.guest_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix overly permissive reminder_logs insert policy
DROP POLICY IF EXISTS "Service can insert reminder logs" ON public.reminder_logs;
