-- Add transfer eligibility flag to inv_stores
ALTER TABLE public.inv_stores
ADD COLUMN is_transfer_eligible boolean NOT NULL DEFAULT true;

-- Set central_warehouse as not transfer eligible by default (they are source, not destination)
-- But keep them eligible as transfer SOURCE
COMMENT ON COLUMN public.inv_stores.is_transfer_eligible IS 'Whether this store can participate in inventory transfers (as source or destination)';