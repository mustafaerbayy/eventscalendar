-- E-posta ile kullanıcı bulup admin rolü ekleyen fonksiyon
CREATE OR REPLACE FUNCTION public.add_admin_by_email(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Sadece admin çağırabilir
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Forbidden: not an admin');
  END IF;

  -- auth.users tablosunda e-posta ile kullanıcıyı bul
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Bu e-posta ile kayıtlı kullanıcı bulunamadı');
  END IF;

  -- Admin rolü ekle (zaten varsa hata yakalanır)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Bu kullanıcı zaten admin');
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Belirli bir rolü toggle eden fonksiyon (ekle yoksa, kaldır varsa)
CREATE OR REPLACE FUNCTION public.toggle_user_role(target_user_id UUID, role_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
  has_role BOOLEAN;
BEGIN
  -- Sadece admin çağırabilir
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Forbidden: not an admin');
  END IF;

  SELECT id INTO existing_id
  FROM public.user_roles
  WHERE user_id = target_user_id AND role::text = role_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE id = existing_id;
    has_role := false;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, role_name::app_role);
    has_role := true;
  END IF;

  RETURN jsonb_build_object('success', true, 'has_role', has_role);
END;
$$;

-- Admin rolünü kaldıran fonksiyon
CREATE OR REPLACE FUNCTION public.remove_admin_role(target_user_id UUID)
RETURNS JSONB
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
    RETURN jsonb_build_object('error', 'Forbidden: not an admin');
  END IF;

  -- Kendini çıkaramaz
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Kendinizi admin listesinden çıkaramazsınız');
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role::text = 'admin';

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_admin_role(UUID) TO authenticated;
