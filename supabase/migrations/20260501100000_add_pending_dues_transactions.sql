-- Create pending_dues_transactions table for approval workflow
CREATE TABLE IF NOT EXISTS public.pending_dues_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    action_type TEXT NOT NULL CHECK (action_type IN ('mark_paid', 'mark_unpaid')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    distribute BOOLEAN DEFAULT false,
    payment_amount DECIMAL(12,2)
);

ALTER TABLE public.pending_dues_transactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read pending transactions (users need to see their own pending status)
DROP POLICY IF EXISTS "Pending transactions viewable by authenticated" ON public.pending_dues_transactions;
CREATE POLICY "Pending transactions viewable by authenticated" ON public.pending_dues_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own pending transactions
DROP POLICY IF EXISTS "Users can create pending transactions" ON public.pending_dues_transactions;
CREATE POLICY "Users can create pending transactions" ON public.pending_dues_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only admins / budget managers can update (approve/reject)
DROP POLICY IF EXISTS "Admins can update pending transactions" ON public.pending_dues_transactions;
CREATE POLICY "Admins can update pending transactions" ON public.pending_dues_transactions
  FOR UPDATE USING (
    (auth.jwt() ->> 'email') = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Users can delete their own pending transactions (cancel), admins can delete any
DROP POLICY IF EXISTS "Users can delete own pending transactions" ON public.pending_dues_transactions;
CREATE POLICY "Users can delete own pending transactions" ON public.pending_dues_transactions
  FOR DELETE USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'email') = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget') OR
    public.has_role(auth.uid(), 'admin')
  );
