-- Create event_contents table
CREATE TABLE IF NOT EXISTS public.event_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- e.g., 'Müzik', 'Video', 'Sunum', 'Diğer'
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_format TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments for better understanding
COMMENT ON TABLE public.event_contents IS 'Stores contents (music, presentation, video, etc.) related to events.';

-- Set up Row Level Security
ALTER TABLE public.event_contents ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can read event contents
CREATE POLICY "Event contents are viewable by everyone" 
    ON public.event_contents FOR SELECT 
    USING (true);

-- Only admins can insert/update/delete event contents
CREATE POLICY "Admins can insert event contents" 
    ON public.event_contents FOR INSERT 
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event contents" 
    ON public.event_contents FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event contents" 
    ON public.event_contents FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin'));

-- Ensure realtime is enabled
alter publication supabase_realtime add table public.event_contents;
