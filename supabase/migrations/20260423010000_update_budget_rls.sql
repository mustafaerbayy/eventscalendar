DROP POLICY IF EXISTS "Budget settings are viewable by authorized users" ON public.budget_settings;
CREATE POLICY "Budget settings are viewable by authenticated users" ON public.budget_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Expenses are viewable by authorized users" ON public.expenses;
CREATE POLICY "Expenses are viewable by authenticated users" ON public.expenses
  FOR SELECT USING (auth.role() = 'authenticated');
