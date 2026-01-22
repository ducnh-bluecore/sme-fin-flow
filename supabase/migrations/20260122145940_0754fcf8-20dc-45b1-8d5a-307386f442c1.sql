-- ============================================
-- CDP METRICS LAYER (Daily + Rolling)
-- ============================================

-- 11. cdp_customer_metrics_daily
CREATE TABLE public.cdp_customer_metrics_daily (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  orders_count integer NOT NULL DEFAULT 0,
  gross_revenue numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0,
  gross_margin numeric NOT NULL DEFAULT 0,
  is_discounted_orders_count integer NOT NULL DEFAULT 0,
  bundle_orders_count integer NOT NULL DEFAULT 0,
  cod_orders_count integer NOT NULL DEFAULT 0,
  orders_total_qty integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, as_of_date, customer_id)
);

CREATE INDEX idx_cdp_metrics_daily_customer ON public.cdp_customer_metrics_daily(tenant_id, customer_id, as_of_date);

ALTER TABLE public.cdp_customer_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_customer_metrics_daily in their tenant"
ON public.cdp_customer_metrics_daily FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 12. cdp_customer_metrics_rolling
CREATE TABLE public.cdp_customer_metrics_rolling (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  window_days integer NOT NULL CHECK (window_days IN (30, 60, 90)),
  orders_count integer NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  gross_margin numeric NOT NULL DEFAULT 0,
  aov numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  return_rate numeric NOT NULL DEFAULT 0,
  discount_share numeric NOT NULL DEFAULT 0,
  discounted_order_share numeric NOT NULL DEFAULT 0,
  bundle_order_share numeric NOT NULL DEFAULT 0,
  cod_order_share numeric NOT NULL DEFAULT 0,
  last_order_at timestamptz NULL,
  prev_order_at timestamptz NULL,
  inter_purchase_days numeric NULL,
  PRIMARY KEY (tenant_id, as_of_date, customer_id, window_days)
);

CREATE INDEX idx_cdp_metrics_rolling_customer ON public.cdp_customer_metrics_rolling(tenant_id, customer_id, as_of_date);
CREATE INDEX idx_cdp_metrics_rolling_window ON public.cdp_customer_metrics_rolling(tenant_id, as_of_date, window_days);

ALTER TABLE public.cdp_customer_metrics_rolling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_customer_metrics_rolling in their tenant"
ON public.cdp_customer_metrics_rolling FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- ============================================
-- CDP INSIGHT ENGINE TABLES
-- ============================================

-- 13. cdp_insight_registry (hard-coded 25 insights)
CREATE TABLE public.cdp_insight_registry (
  insight_code text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('VALUE', 'TIMING', 'MIX', 'RISK', 'QUALITY')),
  population_type text NOT NULL CHECK (population_type IN ('SEGMENT', 'COHORT', 'PERCENTILE', 'ALL')),
  default_population_ref jsonb NOT NULL DEFAULT '{}',
  window_days integer NOT NULL DEFAULT 60,
  baseline_days integer NOT NULL DEFAULT 60,
  threshold_json jsonb NOT NULL DEFAULT '{}',
  cooldown_days integer NOT NULL DEFAULT 14,
  is_enabled boolean NOT NULL DEFAULT true
);

-- 14. cdp_insight_runs
CREATE TABLE public.cdp_insight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  as_of_date date NOT NULL,
  window_days integer NOT NULL,
  baseline_days integer NOT NULL,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'RUNNING')),
  stats jsonb NULL
);

CREATE INDEX idx_cdp_insight_runs_tenant ON public.cdp_insight_runs(tenant_id, as_of_date);

ALTER TABLE public.cdp_insight_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cdp_insight_runs in their tenant"
ON public.cdp_insight_runs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 15. cdp_insight_events (immutable findings)
CREATE TABLE public.cdp_insight_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  insight_code text NOT NULL REFERENCES cdp_insight_registry(insight_code),
  run_id uuid NOT NULL REFERENCES cdp_insight_runs(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  population_type text NOT NULL,
  population_ref jsonb NOT NULL DEFAULT '{}',
  metric_snapshot jsonb NOT NULL DEFAULT '{}',
  impact_snapshot jsonb NOT NULL DEFAULT '{}',
  headline text NOT NULL,
  n_customers integer NOT NULL DEFAULT 0,
  cooldown_until date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_insight_events_tenant ON public.cdp_insight_events(tenant_id, as_of_date);
CREATE INDEX idx_cdp_insight_events_code ON public.cdp_insight_events(tenant_id, insight_code, as_of_date);

ALTER TABLE public.cdp_insight_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cdp_insight_events in their tenant"
ON public.cdp_insight_events FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));