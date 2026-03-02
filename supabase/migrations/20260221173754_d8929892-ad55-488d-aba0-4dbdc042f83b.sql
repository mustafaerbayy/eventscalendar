
-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are publicly readable" ON public.cities FOR SELECT USING (true);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);

-- Venues
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE
);
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues are publicly readable" ON public.venues FOR SELECT USING (true);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  reminder_2h BOOLEAN NOT NULL DEFAULT false,
  reminder_1d BOOLEAN NOT NULL DEFAULT false,
  reminder_2d BOOLEAN NOT NULL DEFAULT false,
  reminder_3d BOOLEAN NOT NULL DEFAULT false,
  reminder_1w BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  time TIME NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id),
  venue_id UUID NOT NULL REFERENCES public.venues(id),
  category_id UUID NOT NULL REFERENCES public.categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are publicly readable" ON public.events FOR SELECT USING (true);

-- RSVPs
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attending', 'not_attending')),
  guest_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Reminder logs
CREATE TABLE public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  offset_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS: everyone can read (for attendance lists), users update own, admins all
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RSVPs RLS: public read (attendance list), authenticated insert/update own
CREATE POLICY "RSVPs are publicly readable" ON public.rsvps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own rsvp" ON public.rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rsvp" ON public.rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rsvp" ON public.rsvps FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage rsvps" ON public.rsvps FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Reminder logs RLS
CREATE POLICY "Users can read own reminder logs" ON public.reminder_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage reminder logs" ON public.reminder_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can insert reminder logs" ON public.reminder_logs FOR INSERT WITH CHECK (true);

-- User roles RLS
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin CUD on cities, categories, venues, events
CREATE POLICY "Admins can insert cities" ON public.cities FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cities" ON public.cities FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cities" ON public.cities FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert events" ON public.events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Validation trigger: guest_count must be 0 when not attending
CREATE OR REPLACE FUNCTION public.validate_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'not_attending' THEN
    NEW.guest_count := 0;
  END IF;
  IF NEW.guest_count < 0 THEN
    NEW.guest_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rsvp_trigger
  BEFORE INSERT OR UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.validate_rsvp();
