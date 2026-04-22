DROP POLICY IF EXISTS "Budget settings are updatable by authorized users" ON public.budget_settings;
CREATE POLICY "Budget settings are updatable by authenticated users" ON public.budget_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Budget settings are insertable by authorized users" ON public.budget_settings;
CREATE POLICY "Budget settings are insertable by authenticated users" ON public.budget_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Expenses are insertable by authorized users" ON public.expenses;
CREATE POLICY "Expenses are insertable by authenticated users" ON public.expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
