
-- Add announcement_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'announcement_admin';
