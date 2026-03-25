-- Migration to add location_url to events table
ALTER TABLE public.events ADD COLUMN location_url TEXT;
