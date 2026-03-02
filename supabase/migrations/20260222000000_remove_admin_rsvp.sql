-- Remove admin RSVP from "Geleneksel Refik İftarı" event
DELETE FROM public.rsvps
WHERE event_id = (
  SELECT id FROM public.events 
  WHERE title ILIKE '%Geleneksel Refik%'
  LIMIT 1
)
AND user_id = (
  SELECT profiles.id FROM public.profiles
  JOIN auth.users ON profiles.id = auth.users.id
  WHERE auth.users.email = 'admin@admin.com'
  LIMIT 1
);
