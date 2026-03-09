-- Add image_url to posts table
ALTER TABLE public.posts ADD COLUMN image_url TEXT;

-- Create storage bucket for social posts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social_posts', 'social_posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for social_posts bucket

-- Public can read any image
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'social_posts' );

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'social_posts' 
  AND auth.role() = 'authenticated'
);

-- Users can delete their own images
CREATE POLICY "Users can delete own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'social_posts' 
  AND auth.uid() = owner
);
