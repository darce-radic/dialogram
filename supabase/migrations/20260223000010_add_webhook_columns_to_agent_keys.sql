-- Add webhook delivery columns to agent_keys
ALTER TABLE public.agent_keys
  ADD COLUMN webhook_url text,
  ADD COLUMN webhook_secret text;
