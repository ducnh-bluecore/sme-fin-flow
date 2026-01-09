-- Add actual_shipping_fee column to external_orders table
ALTER TABLE public.external_orders 
ADD COLUMN IF NOT EXISTS actual_shipping_fee numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.external_orders.actual_shipping_fee IS 'Actual shipping fee from marketplace';