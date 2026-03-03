-- Kullanıcının kendi hesabını silmesini sağlayan fonksiyon
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Kullanıcı oturum açmış mı kontrol et
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Admin kullanıcısı kendini silemez (güvenlik önlemi)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin hesabı silinemez. Lütfen başka bir admin ile iletişime geçin.';
  END IF;

  -- Kullanıcıyı sil (CASCADE sayesinde ilgili tüm veriler silinecek)
  -- profiles, rsvps, reminder_logs otomatik silinir
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Hesabınız başarıyla silindi.'
  );
END;
$$;

-- Authenticated kullanıcıların bu fonksiyonu çağırmasına izin ver
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
