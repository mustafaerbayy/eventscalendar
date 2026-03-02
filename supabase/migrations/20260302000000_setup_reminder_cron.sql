-- pg_net extension'ını aktif et (pg_cron zaten mevcut)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eski job varsa kaldır
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-reminders-every-30min') THEN
    PERFORM cron.unschedule('send-reminders-every-30min');
  END IF;
END $$;

-- Her 30 dakikada bir send-reminders fonksiyonunu çağır
SELECT cron.schedule(
  'send-reminders-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wclytfjwutaebpmkxbgn.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
