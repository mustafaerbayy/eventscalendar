-- Add poll_data column to posts table to store poll configuration and options
ALTER TABLE public.posts ADD COLUMN poll_data JSONB;
