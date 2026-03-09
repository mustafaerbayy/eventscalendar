-- Allow any authenticated user to update posts for poll voting
-- This is needed because voting updates poll_data on another user's post
CREATE POLICY "Authenticated users can vote on polls" ON public.posts
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
