-- Bildirimlerdeki Türkçe karakter sorununu (ş harfi) düzeltmek için fonksiyonu güncelle
CREATE OR REPLACE FUNCTION notify_new_post()
RETURNS TRIGGER AS $$
DECLARE
  author_name TEXT;
BEGIN
  -- Gönderi sahibinin adını al
  SELECT COALESCE(first_name || ' ' || last_name, 'Biri')
  INTO author_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Bildirimi oluştur (Türkçe karakterlerin UTF-8 olduğundan emin olarak)
  -- 'ş' harfi için Unicode escape (\u015F) kullanarak kodlama hatalarının önüne geçiyoruz.
  INSERT INTO public.notifications (user_id, type, title, description, link, post_id)
  SELECT id, 'post', E'Fikir Meydan\u0131', author_name || E' yeni bir g\u00f6nderi payla\u015Ftı!', '/sosyal', NEW.id::text
  FROM auth.users
  WHERE id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
