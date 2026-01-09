-- Add missing columns to external_orders
ALTER TABLE public.external_orders 
ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 0;

ALTER TABLE public.external_orders 
ADD COLUMN IF NOT EXISTS total_fees numeric DEFAULT 0;

-- Add notes column to customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS notes text;