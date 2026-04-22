CREATE TABLE IF NOT EXISTS public.dues_members (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.dues_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dues members viewable by authenticated" ON public.dues_members;
CREATE POLICY "Dues members viewable by authenticated" ON public.dues_members
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dues members insertable by authenticated" ON public.dues_members;
CREATE POLICY "Dues members insertable by authenticated" ON public.dues_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dues members deletable by authenticated" ON public.dues_members;
CREATE POLICY "Dues members deletable by authenticated" ON public.dues_members
  FOR DELETE USING (auth.role() = 'authenticated');
