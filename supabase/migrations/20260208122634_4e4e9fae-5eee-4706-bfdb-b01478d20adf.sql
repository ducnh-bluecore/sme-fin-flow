
-- Create inventory_movements table for L2 Master Model
CREATE TABLE public.inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id),
  movement_date     date NOT NULL,
  branch_id         text,
  branch_name       text,
  product_code      text NOT NULL,
  product_name      text,
  begin_stock       numeric DEFAULT 0,
  purchase_qty      numeric DEFAULT 0,
  sold_qty          numeric DEFAULT 0,
  return_qty        numeric DEFAULT 0,
  transfer_in_qty   numeric DEFAULT 0,
  transfer_out_qty  numeric DEFAULT 0,
  end_stock         numeric DEFAULT 0,
  net_revenue       numeric DEFAULT 0,
  cost_amount       numeric DEFAULT 0,
  channel           varchar DEFAULT 'kiotviet',
  created_at        timestamptz DEFAULT now(),
  UNIQUE(tenant_id, movement_date, branch_id, product_code)
);

-- Indexes for common queries
CREATE INDEX idx_inventory_movements_tenant_date ON public.inventory_movements(tenant_id, movement_date);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(tenant_id, product_code);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Service role full access (same pattern as ad_spend_daily)
CREATE POLICY "Service role full access on inventory_movements"
  ON public.inventory_movements
  FOR ALL
  USING (true)
  WITH CHECK (true);
