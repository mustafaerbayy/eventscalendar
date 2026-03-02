-- Update app_role enum to include report_admin and announcement_admin if not exists
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'announcement_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'report_admin';

-- Recreate has_role function to accept text instead of enum for better flexibility
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- Create alternative version that accepts app_role type
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
