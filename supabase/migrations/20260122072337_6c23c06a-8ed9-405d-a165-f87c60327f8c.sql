-- =============================================================
-- BLUECORE DB-FIRST METRICS REFACTOR
-- Central Metrics Snapshots + Facts + Monthly Summary
-- =============================================================

-- 1. CENTRAL_METRICS_SNAPSHOTS
-- Single row per tenant per snapshot - ALL CFO/CEO metrics
-- =============================================================
CREATE TABLE IF NOT EXISTS public.central_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Revenue & Profit
  net_revenue NUMERIC(20,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(20,2) NOT NULL DEFAULT 0,
  gross_margin_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  contribution_margin NUMERIC(20,2) NOT NULL DEFAULT 0,
  contribution_margin_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  ebitda NUMERIC(20,2) NOT NULL DEFAULT 0,
  ebitda_margin_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  
  -- Cash & Liquidity
  cash_today NUMERIC(20,2) NOT NULL DEFAULT 0,
  cash_7d_forecast NUMERIC(20,2) NOT NULL DEFAULT 0,
  cash_runway_months NUMERIC(6,2) NOT NULL DEFAULT 0,
  
  -- Receivables
  total_ar NUMERIC(20,2) NOT NULL DEFAULT 0,
  overdue_ar NUMERIC(20,2) NOT NULL DEFAULT 0,
  ar_aging_current NUMERIC(20,2) NOT NULL DEFAULT 0,
  ar_aging_30d NUMERIC(20,2) NOT NULL DEFAULT 0,
  ar_aging_60d NUMERIC(20,2) NOT NULL DEFAULT 0,
  ar_aging_90d NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Payables
  total_ap NUMERIC(20,2) NOT NULL DEFAULT 0,
  overdue_ap NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Inventory
  total_inventory_value NUMERIC(20,2) NOT NULL DEFAULT 0,
  slow_moving_inventory NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Working Capital Cycle (precomputed)
  dso NUMERIC(8,2) NOT NULL DEFAULT 0,
  dpo NUMERIC(8,2) NOT NULL DEFAULT 0,
  dio NUMERIC(8,2) NOT NULL DEFAULT 0,
  ccc NUMERIC(8,2) NOT NULL DEFAULT 0,
  
  -- Marketing (from MDP)
  total_marketing_spend NUMERIC(20,2) NOT NULL DEFAULT 0,
  marketing_roas NUMERIC(8,4) NOT NULL DEFAULT 0,
  cac NUMERIC(20,2) NOT NULL DEFAULT 0,
  ltv NUMERIC(20,2) NOT NULL DEFAULT 0,
  ltv_cac_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
  
  -- Order/Customer metrics
  total_orders INTEGER NOT NULL DEFAULT 0,
  avg_order_value NUMERIC(20,2) NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  repeat_customer_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  
  -- Period context
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metadata
  computed_by TEXT DEFAULT 'system',
  computation_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_snapshot UNIQUE (tenant_id, snapshot_at)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_central_metrics_tenant_time 
  ON public.central_metrics_snapshots(tenant_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_central_metrics_period 
  ON public.central_metrics_snapshots(tenant_id, period_start, period_end);

-- Enable RLS
ALTER TABLE public.central_metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own snapshots" 
  ON public.central_metrics_snapshots FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "System can insert snapshots"
  ON public.central_metrics_snapshots FOR INSERT
  WITH CHECK (true);

-- =============================================================
-- 2. CENTRAL_METRIC_FACTS
-- Grain-level breakdowns: SKU, Store, Channel, Customer, Category
-- =============================================================
CREATE TABLE IF NOT EXISTS public.central_metric_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.central_metrics_snapshots(id) ON DELETE CASCADE,
  
  -- Grain identifiers (only one populated per row)
  grain_type TEXT NOT NULL CHECK (grain_type IN ('sku', 'store', 'channel', 'customer', 'category')),
  grain_id TEXT NOT NULL,
  grain_name TEXT,
  
  -- Common metrics per grain
  revenue NUMERIC(20,2) NOT NULL DEFAULT 0,
  cost NUMERIC(20,2) NOT NULL DEFAULT 0,
  profit NUMERIC(20,2) NOT NULL DEFAULT 0,
  margin_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  
  -- Ranking within grain type
  revenue_rank INTEGER,
  profit_rank INTEGER,
  
  -- Period context
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_fact_grain UNIQUE (tenant_id, snapshot_id, grain_type, grain_id)
);

-- Indexes for grain-based queries
CREATE INDEX IF NOT EXISTS idx_metric_facts_tenant_grain 
  ON public.central_metric_facts(tenant_id, grain_type, period_start);
CREATE INDEX IF NOT EXISTS idx_metric_facts_snapshot 
  ON public.central_metric_facts(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_metric_facts_revenue_rank 
  ON public.central_metric_facts(tenant_id, grain_type, revenue_rank);

-- Enable RLS
ALTER TABLE public.central_metric_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own facts" 
  ON public.central_metric_facts FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================================
-- 3. FINANCE_MONTHLY_SUMMARY
-- Monthly aggregated series for charts/reports
-- =============================================================
CREATE TABLE IF NOT EXISTS public.finance_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Month identifier
  year_month TEXT NOT NULL,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  
  -- Revenue & Profit
  net_revenue NUMERIC(20,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(20,2) NOT NULL DEFAULT 0,
  gross_margin_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  contribution_margin NUMERIC(20,2) NOT NULL DEFAULT 0,
  ebitda NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Costs breakdown
  cogs NUMERIC(20,2) NOT NULL DEFAULT 0,
  marketing_spend NUMERIC(20,2) NOT NULL DEFAULT 0,
  operating_expenses NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Cash flow
  cash_inflows NUMERIC(20,2) NOT NULL DEFAULT 0,
  cash_outflows NUMERIC(20,2) NOT NULL DEFAULT 0,
  net_cash_flow NUMERIC(20,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Working capital at month end
  ar_balance NUMERIC(20,2) NOT NULL DEFAULT 0,
  ap_balance NUMERIC(20,2) NOT NULL DEFAULT 0,
  inventory_balance NUMERIC(20,2) NOT NULL DEFAULT 0,
  dso NUMERIC(8,2) NOT NULL DEFAULT 0,
  dpo NUMERIC(8,2) NOT NULL DEFAULT 0,
  dio NUMERIC(8,2) NOT NULL DEFAULT 0,
  ccc NUMERIC(8,2) NOT NULL DEFAULT 0,
  
  -- Volume metrics
  order_count INTEGER NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  avg_order_value NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Marketing efficiency
  roas NUMERIC(8,4) NOT NULL DEFAULT 0,
  cac NUMERIC(20,2) NOT NULL DEFAULT 0,
  
  -- Comparison fields
  revenue_mom_change NUMERIC(8,4),
  revenue_yoy_change NUMERIC(8,4),
  
  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_month UNIQUE (tenant_id, year_month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_monthly_tenant 
  ON public.finance_monthly_summary(tenant_id, year_month DESC);
CREATE INDEX IF NOT EXISTS idx_finance_monthly_period 
  ON public.finance_monthly_summary(tenant_id, month_start, month_end);

-- Enable RLS
ALTER TABLE public.finance_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own monthly summary" 
  ON public.finance_monthly_summary FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- =============================================================
-- 4. VIEW: v_latest_central_metrics
-- Always returns latest snapshot per tenant
-- =============================================================
CREATE OR REPLACE VIEW public.v_latest_central_metrics AS
SELECT DISTINCT ON (tenant_id) *
FROM public.central_metrics_snapshots
ORDER BY tenant_id, snapshot_at DESC;

-- =============================================================
-- 5. REFRESH FUNCTION: compute_central_metrics_snapshot
-- Computes all metrics from source tables and inserts snapshot
-- =============================================================
CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id UUID,
  p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '90 days')::DATE,
  p_period_end DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_net_revenue NUMERIC := 0;
  v_cogs NUMERIC := 0;
  v_gross_profit NUMERIC := 0;
  v_gross_margin_pct NUMERIC := 0;
  v_contribution_margin NUMERIC := 0;
  v_cm_pct NUMERIC := 0;
  v_ebitda NUMERIC := 0;
  v_ebitda_margin_pct NUMERIC := 0;
  v_cash_today NUMERIC := 0;
  v_cash_7d NUMERIC := 0;
  v_runway_months NUMERIC := 0;
  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_ar_current NUMERIC := 0;
  v_ar_30d NUMERIC := 0;
  v_ar_60d NUMERIC := 0;
  v_ar_90d NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  v_inventory_value NUMERIC := 0;
  v_slow_inventory NUMERIC := 0;
  v_dso NUMERIC := 0;
  v_dpo NUMERIC := 0;
  v_dio NUMERIC := 0;
  v_ccc NUMERIC := 0;
  v_marketing_spend NUMERIC := 0;
  v_roas NUMERIC := 0;
  v_cac NUMERIC := 0;
  v_ltv NUMERIC := 0;
  v_ltv_cac_ratio NUMERIC := 0;
  v_total_orders INTEGER := 0;
  v_aov NUMERIC := 0;
  v_total_customers INTEGER := 0;
  v_repeat_rate NUMERIC := 0;
  v_days_in_period NUMERIC;
  v_daily_revenue NUMERIC;
  v_daily_cogs NUMERIC;
  v_opex NUMERIC := 0;
  v_monthly_burn NUMERIC := 0;
BEGIN
  v_days_in_period := GREATEST(1, p_period_end - p_period_start);

  -- REVENUE from external_orders
  SELECT COALESCE(SUM(
    CASE WHEN status NOT IN ('cancelled', 'returned', 'refunded') 
    THEN total_amount - COALESCE(platform_fee, 0) - COALESCE(shipping_fee, 0) ELSE 0 END
  ), 0) INTO v_net_revenue
  FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end;

  -- COGS from external_orders + products
  SELECT COALESCE(SUM(COALESCE(eoi.quantity, 1) * COALESCE(p.unit_cost, eoi.unit_price * 0.6)), 0) INTO v_cogs
  FROM external_order_items eoi
  JOIN external_orders eo ON eoi.order_id = eo.id
  LEFT JOIN products p ON eoi.sku = p.sku AND p.tenant_id = p_tenant_id
  WHERE eo.tenant_id = p_tenant_id AND eo.order_date BETWEEN p_period_start AND p_period_end
    AND eo.status NOT IN ('cancelled', 'returned', 'refunded');

  v_gross_profit := v_net_revenue - v_cogs;
  v_gross_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue) * 100 ELSE 0 END;

  -- OPEX from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_opex
  FROM expenses WHERE tenant_id = p_tenant_id AND expense_date BETWEEN p_period_start AND p_period_end
    AND category NOT IN ('cogs', 'cost_of_goods_sold', 'marketing', 'advertising');

  -- MARKETING SPEND
  SELECT COALESCE(SUM(amount), 0) INTO v_marketing_spend
  FROM expenses WHERE tenant_id = p_tenant_id AND expense_date BETWEEN p_period_start AND p_period_end
    AND category IN ('marketing', 'advertising', 'ads', 'promotion');

  v_contribution_margin := v_gross_profit - v_marketing_spend;
  v_cm_pct := CASE WHEN v_net_revenue > 0 THEN (v_contribution_margin / v_net_revenue) * 100 ELSE 0 END;
  v_ebitda := v_gross_profit - v_opex - v_marketing_spend;
  v_ebitda_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue) * 100 ELSE 0 END;

  -- CASH TODAY from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_today
  FROM bank_accounts WHERE tenant_id = p_tenant_id AND status = 'active';

  -- CASH 7D FORECAST
  SELECT COALESCE(SUM(closing_balance), v_cash_today) INTO v_cash_7d
  FROM cash_forecasts WHERE tenant_id = p_tenant_id AND forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;

  -- AR METRICS from invoices
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE - 1 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date BETWEEN CURRENT_DATE - 60 AND CURRENT_DATE - 31 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM invoices WHERE tenant_id = p_tenant_id AND status != 'paid';

  -- AP METRICS from bills
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills WHERE tenant_id = p_tenant_id AND status NOT IN ('paid', 'cancelled');

  -- INVENTORY from products
  SELECT COALESCE(SUM(stock_quantity * COALESCE(unit_cost, 0)), 0) INTO v_inventory_value
  FROM products WHERE tenant_id = p_tenant_id AND status = 'active';

  -- CYCLE METRICS
  v_daily_revenue := v_net_revenue / NULLIF(v_days_in_period, 0);
  v_daily_cogs := v_cogs / NULLIF(v_days_in_period, 0);
  v_dso := CASE WHEN v_daily_revenue > 0 THEN v_total_ar / v_daily_revenue ELSE 0 END;
  v_dpo := CASE WHEN v_daily_cogs > 0 THEN v_total_ap / v_daily_cogs ELSE 0 END;
  v_dio := CASE WHEN v_daily_cogs > 0 THEN v_inventory_value / v_daily_cogs ELSE 0 END;
  v_ccc := v_dso + v_dio - v_dpo;

  -- CASH RUNWAY
  v_monthly_burn := (v_cogs + v_opex + v_marketing_spend) / NULLIF(v_days_in_period / 30, 0);
  v_runway_months := CASE WHEN v_monthly_burn > 0 THEN v_cash_today / v_monthly_burn ELSE 99 END;

  -- ORDERS & CUSTOMERS
  SELECT COUNT(*), COALESCE(AVG(total_amount), 0) INTO v_total_orders, v_aov
  FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end
    AND status NOT IN ('cancelled', 'returned', 'refunded');

  SELECT COUNT(DISTINCT customer_id) INTO v_total_customers
  FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end AND customer_id IS NOT NULL;

  -- MARKETING EFFICIENCY
  v_roas := CASE WHEN v_marketing_spend > 0 THEN v_net_revenue / v_marketing_spend ELSE 0 END;
  v_cac := CASE WHEN v_total_customers > 0 THEN v_marketing_spend / v_total_customers ELSE 0 END;
  v_ltv := v_aov * 3;
  v_ltv_cac_ratio := CASE WHEN v_cac > 0 THEN v_ltv / v_cac ELSE 0 END;

  -- INSERT SNAPSHOT
  INSERT INTO central_metrics_snapshots (
    tenant_id, snapshot_at, period_start, period_end,
    net_revenue, gross_profit, gross_margin_percent,
    contribution_margin, contribution_margin_percent,
    ebitda, ebitda_margin_percent,
    cash_today, cash_7d_forecast, cash_runway_months,
    total_ar, overdue_ar, ar_aging_current, ar_aging_30d, ar_aging_60d, ar_aging_90d,
    total_ap, overdue_ap, total_inventory_value, slow_moving_inventory,
    dso, dpo, dio, ccc,
    total_marketing_spend, marketing_roas, cac, ltv, ltv_cac_ratio,
    total_orders, avg_order_value, total_customers, repeat_customer_rate,
    computed_by, computation_duration_ms
  ) VALUES (
    p_tenant_id, now(), p_period_start, p_period_end,
    v_net_revenue, v_gross_profit, v_gross_margin_pct,
    v_contribution_margin, v_cm_pct, v_ebitda, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d, v_runway_months,
    v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    v_total_ap, v_overdue_ap, v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_roas, v_cac, v_ltv, v_ltv_cac_ratio,
    v_total_orders, v_aov, v_total_customers, v_repeat_rate,
    'compute_central_metrics_snapshot',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
  ) RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- =============================================================
-- 6. FUNCTION: get_latest_central_metrics
-- API-friendly function to get latest or compute if stale
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_latest_central_metrics(
  p_tenant_id UUID,
  p_max_age_minutes INTEGER DEFAULT 60
)
RETURNS public.central_metrics_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest RECORD;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_latest FROM central_metrics_snapshots
  WHERE tenant_id = p_tenant_id ORDER BY snapshot_at DESC LIMIT 1;

  IF v_latest IS NULL OR v_latest.snapshot_at < (now() - (p_max_age_minutes || ' minutes')::INTERVAL) THEN
    v_new_id := compute_central_metrics_snapshot(p_tenant_id);
    SELECT * INTO v_latest FROM central_metrics_snapshots WHERE id = v_new_id;
  END IF;

  RETURN v_latest;
END;
$$;