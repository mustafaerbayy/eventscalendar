-- Change default values for reminder columns in profiles table
ALTER TABLE public.profiles 
  ALTER COLUMN reminder_2h SET DEFAULT true,
  ALTER COLUMN reminder_1d SET DEFAULT true,
  ALTER COLUMN reminder_2d SET DEFAULT true,
  ALTER COLUMN reminder_3d SET DEFAULT true,
  ALTER COLUMN reminder_1w SET DEFAULT true;

-- Update existing profiles to enable reminders by default if they were false
-- Note: This will enable them for everyone. If we only want to enable for those who haven't changed them, 
-- it's hard to tell, but usually "default as open for every user" implies a one-time push to all users.
UPDATE public.profiles 
SET 
  reminder_2h = true,
  reminder_1d = true,
  reminder_2d = true,
  reminder_3d = true,
  reminder_1w = true;
