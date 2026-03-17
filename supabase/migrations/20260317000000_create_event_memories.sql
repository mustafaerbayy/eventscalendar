
-- Create event_memories table
CREATE TABLE public.event_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_memories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Event memories are publicly readable" 
ON public.event_memories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload memories" 
ON public.event_memories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" 
ON public.event_memories FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for event memories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event_memories', 'event_memories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event_memories bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'event_memories' );

CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'event_memories' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own memory images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'event_memories' 
  AND auth.uid() = owner
);
