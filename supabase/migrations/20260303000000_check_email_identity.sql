-- Email'in var olup olmadığını ve identity'lerini kontrol eden function
-- Version 1.1: Improved for clarity and speed
create or replace function check_email_identity(p_email text)
returns table (
  user_id uuid,
  exists boolean,
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
  -- Auth.users tablosundan user'ı bul
  select id into v_user_id
  from auth.users
  where email = p_email
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
  where user_id = v_user_id;
  
  -- Google identity var mı?
  v_has_google := v_identities is not null and 'google' = any(v_identities);
  
  -- Password identity var mı?
  -- Supabase stores email/password as 'email' provider
  v_has_password := v_identities is not null and 'email' = any(v_identities);
  
  return query select v_user_id, true, v_has_google, v_has_password, v_identities;
end;
$$ language plpgsql security definer set search_path = public;

-- Policy - herkes çağırabilir (sadece email parametresi ile)
revoke all on function check_email_identity(text) from public;
grant execute on function check_email_identity(text) to anon, authenticated;
