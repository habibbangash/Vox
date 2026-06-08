-- Signal refresh cron job — runs compute_signals() every hour.
--
-- PREREQUISITE: Enable pg_cron in Supabase Dashboard → Database → Extensions → pg_cron
-- Apply this migration AFTER enabling the extension.
--
-- To verify cron is running: SELECT * FROM cron.job;
-- To see last run:           SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;

SELECT cron.schedule(
  'compute-signals-hourly',        -- job name (must be unique)
  '0 * * * *',                     -- every hour on the hour
  $$SELECT public.compute_signals()$$
);
