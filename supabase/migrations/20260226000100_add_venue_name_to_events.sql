-- Add venue_name column to events table for direct text input
ALTER TABLE public.events 
ADD COLUMN venue_name text;

-- This allows events to have either venue_id (from venues table) or venue_name (direct text input)
