-- Add storage_capacity column to inv_stores
ALTER TABLE public.inv_stores ADD COLUMN IF NOT EXISTS storage_capacity INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.inv_stores.storage_capacity IS 'Sức chứa hàng (kho phía sau) tính bằng SKU';
COMMENT ON COLUMN public.inv_stores.display_capacity IS 'Sức trưng bày tính bằng SKU';
COMMENT ON COLUMN public.inv_stores.capacity IS 'Tổng sức chứa = display_capacity + storage_capacity';