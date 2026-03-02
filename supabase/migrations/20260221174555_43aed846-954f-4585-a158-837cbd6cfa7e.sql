
-- Fix: All policies were created as RESTRICTIVE (default in some configs). 
-- We need to recreate them as PERMISSIVE.

-- Drop all existing policies and recreate as PERMISSIVE

-- CITIES
DROP POLICY IF EXISTS "Cities are publicly readable" ON public.cities;
DROP POLICY IF EXISTS "Admins can insert cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can update cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can delete cities" ON public.cities;

CREATE POLICY "Cities are publicly readable" ON public.cities FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert cities" ON public.cities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cities" ON public.cities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cities" ON public.cities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- VENUES
DROP POLICY IF EXISTS "Venues are publicly readable" ON public.venues;
DROP POLICY IF EXISTS "Admins can insert venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can update venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can delete venues" ON public.venues;

CREATE POLICY "Venues are publicly readable" ON public.venues FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- EVENTS
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

CREATE POLICY "Events are publicly readable" ON public.events FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RSVPS
DROP POLICY IF EXISTS "RSVPs are publicly readable" ON public.rsvps;
DROP POLICY IF EXISTS "Authenticated users can insert own rsvp" ON public.rsvps;
DROP POLICY IF EXISTS "Users can update own rsvp" ON public.rsvps;
DROP POLICY IF EXISTS "Users can delete own rsvp" ON public.rsvps;
DROP POLICY IF EXISTS "Admins can manage rsvps" ON public.rsvps;

CREATE POLICY "RSVPs are publicly readable" ON public.rsvps FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert own rsvp" ON public.rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rsvp" ON public.rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rsvp" ON public.rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage rsvps" ON public.rsvps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- REMINDER_LOGS
DROP POLICY IF EXISTS "Users can read own reminder logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Admins can manage reminder logs" ON public.reminder_logs;

CREATE POLICY "Users can read own reminder logs" ON public.reminder_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage reminder logs" ON public.reminder_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
