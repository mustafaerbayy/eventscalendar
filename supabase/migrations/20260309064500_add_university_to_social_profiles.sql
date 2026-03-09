-- Add university column to social_profiles
ALTER TABLE public.social_profiles ADD COLUMN IF NOT EXISTS university text;
