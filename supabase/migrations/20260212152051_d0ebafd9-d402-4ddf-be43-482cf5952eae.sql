
-- ============================================
-- SIZE INTELLIGENCE ENGINE — Phase 2: Smart Transfer
-- ============================================

-- state_size_transfer_daily: Size-aware transfer opportunities
CREATE TABLE public.state_size_transfer_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  size_code text NOT NULL,
  source_store_id uuid NOT NULL,
  dest_store_id uuid NOT NULL,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  transfer_qty integer NOT NULL DEFAULT 0,
  transfer_score numeric NOT NULL DEFAULT 0,
  source_on_hand integer NOT NULL DEFAULT 0,
  dest_on_hand integer NOT NULL DEFAULT 0,
  dest_velocity numeric NOT NULL DEFAULT 0,
  estimated_revenue_gain numeric NOT NULL DEFAULT 0,
  estimated_transfer_cost numeric NOT NULL DEFAULT 0,
  net_benefit numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_size_transfer_daily_unique UNIQUE (tenant_id, product_id, size_code, source_store_id, dest_store_id, as_of_date)
);

ALTER TABLE public.state_size_transfer_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for state_size_transfer_daily"
  ON public.state_size_transfer_daily
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY "Service role full access on state_size_transfer_daily"
  ON public.state_size_transfer_daily
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_size_transfer_tenant_date ON public.state_size_transfer_daily (tenant_id, as_of_date);
CREATE INDEX idx_size_transfer_product ON public.state_size_transfer_daily (tenant_id, product_id);
CREATE INDEX idx_size_transfer_score ON public.state_size_transfer_daily (tenant_id, transfer_score DESC);
