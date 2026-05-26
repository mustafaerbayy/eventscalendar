-- Eski job varsa kaldır
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-pending-dues-daily') THEN
    PERFORM cron.unschedule('notify-pending-dues-daily');
  END IF;
END $$;

-- Her gün saat 18:00 UTC (21:00 Türkiye saati) çalıştır
SELECT cron.schedule(
  'notify-pending-dues-daily',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wclytfjwutaebpmkxbgn.supabase.co/functions/v1/notify-pending-dues',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
