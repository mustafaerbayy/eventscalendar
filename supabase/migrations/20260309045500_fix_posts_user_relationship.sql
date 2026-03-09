-- Update posts table to explicitly reference social_profiles for easier querying
ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE public.posts
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.social_profiles(user_id) 
ON DELETE CASCADE;
