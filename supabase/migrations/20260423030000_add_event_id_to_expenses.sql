ALTER TABLE public.expenses ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
