-- Create social_profiles table
CREATE TABLE public.social_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  social_name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  job_title TEXT,
  bio TEXT,
  profile_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Public can read all social profiles
CREATE POLICY "Social profiles are publicly readable" ON public.social_profiles FOR SELECT USING (true);

-- Users can update their own social profile
CREATE POLICY "Users can update own social profile" ON public.social_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own social profile (fallback in case trigger fails)
CREATE POLICY "Users can insert own social profile" ON public.social_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage social profiles" ON public.social_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_social_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_profiles_updated_at_trigger
BEFORE UPDATE ON public.social_profiles
FOR EACH ROW
EXECUTE FUNCTION update_social_profiles_updated_at();

-- Backfill existing profiles
INSERT INTO public.social_profiles (user_id, social_name)
SELECT 
  id as user_id, 
  TRIM(first_name || ' ' || last_name) as social_name
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Create a function/trigger to auto-create social profile when a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.social_profiles (user_id, social_name)
  VALUES (
    NEW.id,
    TRIM(NEW.first_name || ' ' || NEW.last_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_social
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();
