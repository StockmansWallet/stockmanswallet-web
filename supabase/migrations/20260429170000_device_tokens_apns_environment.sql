-- Store the APNs token environment so the Edge Function can send each device
-- token to the correct Apple gateway. Sandbox and production APNs tokens are
-- not interchangeable.

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS apns_environment TEXT;

UPDATE public.device_tokens
SET apns_environment = 'development'
WHERE apns_environment IS NULL;

ALTER TABLE public.device_tokens
  ALTER COLUMN apns_environment SET DEFAULT 'development',
  ALTER COLUMN apns_environment SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'device_tokens_apns_environment_check'
      AND conrelid = 'public.device_tokens'::regclass
  ) THEN
    ALTER TABLE public.device_tokens
      ADD CONSTRAINT device_tokens_apns_environment_check
      CHECK (apns_environment IN ('development', 'production'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_environment
  ON public.device_tokens(user_id, apns_environment);
