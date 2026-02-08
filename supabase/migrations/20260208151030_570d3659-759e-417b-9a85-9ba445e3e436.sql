
-- Create inventory_snapshots table for marketplace stock snapshots
CREATE TABLE public.inventory_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  channel TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku TEXT DEFAULT '',
  warehouse_id TEXT DEFAULT '',
  warehouse_name TEXT,
  quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  sellable_quantity INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL,
  source_table TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for upsert deduplication
CREATE UNIQUE INDEX idx_inventory_snapshots_upsert 
  ON public.inventory_snapshots(tenant_id, channel, product_id, sku, warehouse_id, snapshot_date);

-- Enable RLS
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: service role full access
CREATE POLICY "Service role full access on inventory_snapshots"
  ON public.inventory_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Query indexes
CREATE INDEX idx_inventory_snapshots_tenant_channel ON public.inventory_snapshots(tenant_id, channel, snapshot_date DESC);
CREATE INDEX idx_inventory_snapshots_sku ON public.inventory_snapshots(tenant_id, sku) WHERE sku != '';
