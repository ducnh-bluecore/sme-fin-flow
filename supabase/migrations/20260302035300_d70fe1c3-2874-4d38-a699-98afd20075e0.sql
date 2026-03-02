
ALTER TABLE public.inv_stores 
ADD COLUMN is_fill_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.inv_stores.is_fill_enabled IS 'Bật/tắt phủ nền (V1 allocation) cho cửa hàng này';
