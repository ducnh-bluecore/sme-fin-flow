-- Add province and country columns required by sync mapping
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS province text;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS country text;