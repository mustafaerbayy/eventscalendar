-- Add linkedin_url to social_profiles table
ALTER TABLE public.social_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
