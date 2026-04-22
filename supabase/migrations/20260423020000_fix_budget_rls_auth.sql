DROP POLICY IF EXISTS "Budget settings are updatable by authorized users" ON public.budget_settings;
CREATE POLICY "Budget settings are updatable by authorized users" ON public.budget_settings
  FOR UPDATE USING (
    (auth.jwt() ->> 'email') = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

DROP POLICY IF EXISTS "Budget settings are insertable by authorized users" ON public.budget_settings;
CREATE POLICY "Budget settings are insertable by authorized users" ON public.budget_settings
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email') = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

DROP POLICY IF EXISTS "Expenses are insertable by authorized users" ON public.expenses;
CREATE POLICY "Expenses are insertable by authorized users" ON public.expenses
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email') = 'admin@admin.com' OR
    public.has_role(auth.uid(), 'manage_budget')
  );

DROP POLICY IF EXISTS "Expenses are updatable by creator or superadmin" ON public.expenses;
CREATE POLICY "Expenses are updatable by creator or superadmin" ON public.expenses
  FOR UPDATE USING (
    auth.uid() = created_by OR
    (auth.jwt() ->> 'email') = 'admin@admin.com'
  );

DROP POLICY IF EXISTS "Expenses are deletable by creator or superadmin" ON public.expenses;
CREATE POLICY "Expenses are deletable by creator or superadmin" ON public.expenses
  FOR DELETE USING (
    auth.uid() = created_by OR
    (auth.jwt() ->> 'email') = 'admin@admin.com'
  );
