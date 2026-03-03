-- Update the handle_new_user trigger to properly extract names from Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_raw_name TEXT;
BEGIN
  -- First, try to get names from explicit first_name and last_name fields (from email/password signup)
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  -- If names are empty, try to extract from Google OAuth data
  IF v_first_name = '' OR v_last_name = '' THEN
    -- Try given_name and family_name from Google
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'given_name', v_first_name);
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'family_name', v_last_name);
    
    -- If still empty, try to split the full name field
    IF v_first_name = '' OR v_last_name = '' THEN
      v_raw_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
      IF v_raw_name != '' THEN
        -- Split name: first part is first name, rest is last name
        IF v_first_name = '' THEN
          v_first_name := TRIM(SPLIT_PART(v_raw_name, ' ', 1));
        END IF;
        IF v_last_name = '' THEN
          v_last_name := TRIM(SUBSTRING(v_raw_name, LENGTH(TRIM(SPLIT_PART(v_raw_name, ' ', 1))) + 2));
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(v_first_name, ''), ''),
    COALESCE(NULLIF(v_last_name, ''), '')
  );
  RETURN NEW;
END;
$$;
