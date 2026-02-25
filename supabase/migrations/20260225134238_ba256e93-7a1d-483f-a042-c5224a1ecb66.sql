-- Add unique constraint for upsert support on inv_state_positions
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_state_positions_upsert 
  ON public.inv_state_positions(tenant_id, store_id, sku, snapshot_date);