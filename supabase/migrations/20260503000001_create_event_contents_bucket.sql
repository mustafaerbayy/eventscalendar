-- Create a new storage bucket for event contents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event_contents', 'event_contents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the storage bucket
-- Everyone can view files in the event_contents bucket
CREATE POLICY "Public Access for event_contents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event_contents');

-- Authenticated admins can upload files
CREATE POLICY "Admin Upload Access for event_contents" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'event_contents' AND 
    public.has_role(auth.uid(), 'admin')
);

-- Authenticated admins can update files
CREATE POLICY "Admin Update Access for event_contents" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'event_contents' AND 
    public.has_role(auth.uid(), 'admin')
);

-- Authenticated admins can delete files
CREATE POLICY "Admin Delete Access for event_contents" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'event_contents' AND 
    public.has_role(auth.uid(), 'admin')
);
