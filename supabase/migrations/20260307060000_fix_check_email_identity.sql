-- check_email_identity fonksiyonunu case-insensitive ve daha sağlam hale getiriyoruz
DROP FUNCTION IF EXISTS check_email_identity(text);
create or replace function check_email_identity(p_email text)
returns table (
  user_id uuid,
  "exists" boolean,
  has_google_identity boolean,
  has_password_identity boolean,
  identities text[]
) as $$
declare
  v_user_id uuid;
  v_identities text[];
  v_has_google boolean;
  v_has_password boolean;
begin
  -- Auth.users tablosundan user'ı case-insensitive şekilde bul
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;
  
  -- Eğer user bulunamadı
  if v_user_id is null then
    return query select null::uuid, false, false, false, null::text[];
    return;
  end if;
  
  -- User'ın identity'lerini bul
  select array_agg(provider)
  into v_identities
  from auth.identities
  where auth.identities.user_id = v_user_id;
  
  -- Google identity var mı?
  v_has_google := (v_identities is not null and 'google' = any(v_identities));
  
  -- Password identity var mı?
  v_has_password := (v_identities is not null and 'email' = any(v_identities));
  
  return query select v_user_id, true, v_has_google, v_has_password, v_identities;
end;
$$ language plpgsql security definer set search_path = public;

-- Anonim erişime izin ver
grant execute on function check_email_identity(text) to anon, authenticated;
