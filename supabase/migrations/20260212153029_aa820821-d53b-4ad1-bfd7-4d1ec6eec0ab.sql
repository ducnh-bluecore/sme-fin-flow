
-- Phase 3A: Post-Impact + Cash Lock + Margin Leak tables

-- 1. Post-Impact Metrics
CREATE TABLE public.post_impact_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  card_action_id UUID REFERENCES public.card_actions(id),
  product_id TEXT NOT NULL,
  baseline_date DATE NOT NULL,
  measure_date DATE NOT NULL,
  baseline_window_days INTEGER NOT NULL DEFAULT 7,
  delta_revenue NUMERIC DEFAULT 0,
  delta_margin NUMERIC DEFAULT 0,
  delta_health_score NUMERIC DEFAULT 0,
  delta_inventory_age NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_impact_tenant ON public.post_impact_metrics(tenant_id, product_id);
ALTER TABLE public.post_impact_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for post_impact_metrics" ON public.post_impact_metrics FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY "Service role full access on post_impact_metrics" ON public.post_impact_metrics FOR ALL USING (true) WITH CHECK (true);

-- 2. Cash Lock Daily
CREATE TABLE public.state_cash_lock_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inventory_value NUMERIC NOT NULL DEFAULT 0,
  cash_locked_value NUMERIC NOT NULL DEFAULT 0,
  locked_pct NUMERIC NOT NULL DEFAULT 0,
  expected_release_days INTEGER,
  lock_driver TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_cash_lock_daily_uq ON public.state_cash_lock_daily(tenant_id, product_id, as_of_date);
CREATE INDEX idx_cash_lock_daily_tenant ON public.state_cash_lock_daily(tenant_id, as_of_date);
ALTER TABLE public.state_cash_lock_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for state_cash_lock_daily" ON public.state_cash_lock_daily FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY "Service role full access on state_cash_lock_daily" ON public.state_cash_lock_daily FOR ALL USING (true) WITH CHECK (true);

-- 3. Margin Leak Daily
CREATE TABLE public.state_margin_leak_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  margin_leak_value NUMERIC NOT NULL DEFAULT 0,
  leak_driver TEXT NOT NULL,
  leak_detail JSONB DEFAULT '{}',
  cumulative_leak_30d NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_margin_leak_daily_uq ON public.state_margin_leak_daily(tenant_id, product_id, as_of_date, leak_driver);
CREATE INDEX idx_margin_leak_daily_tenant ON public.state_margin_leak_daily(tenant_id, as_of_date);
ALTER TABLE public.state_margin_leak_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for state_margin_leak_daily" ON public.state_margin_leak_daily FOR ALL USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY "Service role full access on state_margin_leak_daily" ON public.state_margin_leak_daily FOR ALL USING (true) WITH CHECK (true);
