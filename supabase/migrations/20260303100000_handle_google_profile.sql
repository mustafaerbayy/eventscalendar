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
  v_space_pos INT;
BEGIN
  -- First, try to get names from explicit first_name and last_name fields (from email/password signup)
  v_first_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', ''));
  v_last_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', ''));

  -- If names are empty, try to extract from Google OAuth data
  IF COALESCE(v_first_name, '') = '' OR COALESCE(v_last_name, '') = '' THEN
    -- Try given_name and family_name from Google
    IF COALESCE(v_first_name, '') = '' THEN
      v_first_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'given_name', ''));
    END IF;
    IF COALESCE(v_last_name, '') = '' THEN
      v_last_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'family_name', ''));
    END IF;
    
    -- If names are still empty, try to split the full name field
    IF COALESCE(v_first_name, '') = '' OR COALESCE(v_last_name, '') = '' THEN
      v_raw_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'name', ''));
      IF COALESCE(v_raw_name, '') != '' THEN
        -- Find the first space to separate first and last name
        v_space_pos := POSITION(' ' IN v_raw_name);
        
        IF v_space_pos > 0 THEN
          -- Split at first space
          IF COALESCE(v_first_name, '') = '' THEN
            v_first_name := TRIM(SUBSTRING(v_raw_name FROM 1 FOR v_space_pos - 1));
          END IF;
          IF COALESCE(v_last_name, '') = '' THEN
            v_last_name := TRIM(SUBSTRING(v_raw_name FROM v_space_pos + 1));
          END IF;
        ELSE
          -- No space, entire name is first name
          IF COALESCE(v_first_name, '') = '' THEN
            v_first_name := v_raw_name;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(v_first_name, ''),
    COALESCE(v_last_name, '')
  );
  RETURN NEW;
END;
$$;
