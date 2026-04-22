-- Create manage_budget role type if not exists
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manage_budget';

-- Create budget_settings table
CREATE TABLE public.budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_budget NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmin (admin@admin.com) or manage_budget users can view and update budget_settings
CREATE POLICY "Budget settings are viewable by authorized users" ON public.budget_settings
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Budget settings are updatable by authorized users" ON public.budget_settings
  FOR UPDATE USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

CREATE POLICY "Budget settings are insertable by authorized users" ON public.budget_settings
  FOR INSERT WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

-- Initialize budget_settings with one row
INSERT INTO public.budget_settings (total_budget) VALUES (0);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  description TEXT,
  spent_by_user_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses RLS
-- Select: all authorized users (admin, manage_budget) can read
CREATE POLICY "Expenses are viewable by authorized users" ON public.expenses
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Insert: authorized users can insert
CREATE POLICY "Expenses are insertable by authorized users" ON public.expenses
  FOR INSERT WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

-- Update: only creator or admin@admin.com can update
CREATE POLICY "Expenses are updatable by creator or superadmin" ON public.expenses
  FOR UPDATE USING (
    auth.uid() = created_by OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com'
  );

-- Delete: only creator or admin@admin.com can delete
CREATE POLICY "Expenses are deletable by creator or superadmin" ON public.expenses
  FOR DELETE USING (
    auth.uid() = created_by OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@admin.com'
  );

-- Function to toggle budget role (only admin@admin.com can do this)
CREATE OR REPLACE FUNCTION public.toggle_budget_role(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
  has_role BOOLEAN;
  caller_email TEXT;
BEGIN
  -- Sadece admin@admin.com çağırabilir
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email != 'admin@admin.com' THEN
    RETURN jsonb_build_object('error', 'Forbidden: sadece süper admin yetki verebilir');
  END IF;

  SELECT id INTO existing_id
  FROM public.user_roles
  WHERE user_id = target_user_id AND role::text = 'manage_budget'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE id = existing_id;
    has_role := false;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'manage_budget'::app_role);
    has_role := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'has_role', has_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_budget_role(UUID) TO authenticated;
