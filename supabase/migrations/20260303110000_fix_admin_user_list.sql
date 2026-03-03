-- Admin panelinde kullanıcı listesi profiles tablosundan ad-soyad çekecek şekilde güncelle
CREATE OR REPLACE FUNCTION public.list_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ,
  has_report_role BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece admin çağırabilir
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: not an admin';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.first_name, '')::TEXT AS first_name,
    COALESCE(p.last_name, '')::TEXT AS last_name,
    u.created_at,
    EXISTS(
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = u.id AND ur2.role::text = 'report_admin'
    ) AS has_report_role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Admin listesi için de aynı düzeltme
CREATE OR REPLACE FUNCTION public.list_admins_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  has_announcement_access BOOLEAN,
  has_report_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece admin çağırabilir
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: not an admin';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.first_name, '')::TEXT AS first_name,
    COALESCE(p.last_name, '')::TEXT AS last_name,
    EXISTS(
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = u.id AND ur2.role::text = 'announcement_admin'
    ) AS has_announcement_access,
    EXISTS(
      SELECT 1 FROM public.user_roles ur3
      WHERE ur3.user_id = u.id AND ur3.role::text = 'report_admin'
    ) AS has_report_access
  FROM auth.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role::text = 'admin'
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.email;
END;
$$;
