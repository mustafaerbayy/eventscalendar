ALTER TABLE public.budget_settings ADD COLUMN IF NOT EXISTS dues_amount DECIMAL(12,2) NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS public.dues_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(user_id, year, month)
);

ALTER TABLE public.dues_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dues payments are viewable by authenticated users" ON public.dues_payments;
CREATE POLICY "Dues payments are viewable by authenticated users" ON public.dues_payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dues payments are insertable by authenticated users" ON public.dues_payments;
CREATE POLICY "Dues payments are insertable by authenticated users" ON public.dues_payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dues payments are deletable by authenticated users" ON public.dues_payments;
CREATE POLICY "Dues payments are deletable by authenticated users" ON public.dues_payments
  FOR DELETE USING (auth.role() = 'authenticated');
