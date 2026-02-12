
-- ============================================
-- SIZE INTELLIGENCE ENGINE — STATE Layer Tables
-- ============================================

-- 1. state_size_health_daily — Core decision table
CREATE TABLE public.state_size_health_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  store_id uuid,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  size_health_score numeric NOT NULL DEFAULT 100,
  curve_state text NOT NULL DEFAULT 'healthy',
  deviation_score numeric NOT NULL DEFAULT 0,
  core_size_missing boolean NOT NULL DEFAULT false,
  shallow_depth_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_size_health_daily_unique UNIQUE (tenant_id, product_id, store_id, as_of_date)
);

ALTER TABLE public.state_size_health_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for state_size_health_daily"
  ON public.state_size_health_daily
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY "Service role full access on state_size_health_daily"
  ON public.state_size_health_daily
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_size_health_tenant_date ON public.state_size_health_daily (tenant_id, as_of_date);
CREATE INDEX idx_size_health_product ON public.state_size_health_daily (tenant_id, product_id);
CREATE INDEX idx_size_health_curve_state ON public.state_size_health_daily (tenant_id, curve_state);

-- 2. state_lost_revenue_daily — Revenue leak estimation
CREATE TABLE public.state_lost_revenue_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  lost_units_est integer NOT NULL DEFAULT 0,
  lost_revenue_est numeric NOT NULL DEFAULT 0,
  driver text NOT NULL DEFAULT 'imbalance',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_lost_revenue_daily_unique UNIQUE (tenant_id, product_id, as_of_date)
);

ALTER TABLE public.state_lost_revenue_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for state_lost_revenue_daily"
  ON public.state_lost_revenue_daily
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY "Service role full access on state_lost_revenue_daily"
  ON public.state_lost_revenue_daily
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lost_revenue_tenant_date ON public.state_lost_revenue_daily (tenant_id, as_of_date);
CREATE INDEX idx_lost_revenue_product ON public.state_lost_revenue_daily (tenant_id, product_id);

-- 3. state_markdown_risk_daily — Markdown prediction
CREATE TABLE public.state_markdown_risk_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  markdown_risk_score numeric NOT NULL DEFAULT 0,
  markdown_eta_days integer,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_markdown_risk_daily_unique UNIQUE (tenant_id, product_id, as_of_date)
);

ALTER TABLE public.state_markdown_risk_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for state_markdown_risk_daily"
  ON public.state_markdown_risk_daily
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY "Service role full access on state_markdown_risk_daily"
  ON public.state_markdown_risk_daily
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_markdown_risk_tenant_date ON public.state_markdown_risk_daily (tenant_id, as_of_date);
CREATE INDEX idx_markdown_risk_product ON public.state_markdown_risk_daily (tenant_id, product_id);
