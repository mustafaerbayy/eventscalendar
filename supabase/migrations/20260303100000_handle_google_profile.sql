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
  v_name_array TEXT[];
  v_name_count INT;
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
        -- Split by spaces and filter out empty parts
        v_name_array := ARRAY(SELECT unnest(string_to_array(v_raw_name, ' ')) WHERE trim(unnest) != '');
        v_name_count := array_length(v_name_array, 1);
        
        IF v_name_count >= 2 THEN
          -- Strategy: Last part is surname, everything else is first name
          IF COALESCE(v_first_name, '') = '' THEN
            v_first_name := array_to_string(v_name_array[1:v_name_count-1], ' ');
          END IF;
          IF COALESCE(v_last_name, '') = '' THEN
            v_last_name := v_name_array[v_name_count];
          END IF;
        ELSIF v_name_count = 1 THEN
          -- Only one word: treat as first name
          IF COALESCE(v_first_name, '') = '' THEN
            v_first_name := v_name_array[1];
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
