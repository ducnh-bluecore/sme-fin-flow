-- =============================================================
-- FINAL CHECK VIOLATIONS FIX - NEW PRECOMPUTED TABLES
-- =============================================================

-- 1) finance_expenses_daily - Daily expense aggregates
CREATE TABLE IF NOT EXISTS public.finance_expenses_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- By category (precomputed)
  cogs_amount NUMERIC(18,2) DEFAULT 0,
  salary_amount NUMERIC(18,2) DEFAULT 0,
  rent_amount NUMERIC(18,2) DEFAULT 0,
  utilities_amount NUMERIC(18,2) DEFAULT 0,
  marketing_amount NUMERIC(18,2) DEFAULT 0,
  logistics_amount NUMERIC(18,2) DEFAULT 0,
  depreciation_amount NUMERIC(18,2) DEFAULT 0,
  interest_amount NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  other_amount NUMERIC(18,2) DEFAULT 0,
  expense_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, day)
);

-- 2) working_capital_daily - Daily working capital metrics
CREATE TABLE IF NOT EXISTS public.working_capital_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  -- Core cycle metrics (precomputed)
  dso NUMERIC(8,2) DEFAULT 0,
  dpo NUMERIC(8,2) DEFAULT 0,
  dio NUMERIC(8,2) DEFAULT 0,
  ccc NUMERIC(8,2) DEFAULT 0,
  -- AR/AP balances
  total_ar NUMERIC(18,2) DEFAULT 0,
  overdue_ar NUMERIC(18,2) DEFAULT 0,
  total_ap NUMERIC(18,2) DEFAULT 0,
  overdue_ap NUMERIC(18,2) DEFAULT 0,
  -- Working capital
  inventory NUMERIC(18,2) DEFAULT 0,
  net_working_capital NUMERIC(18,2) DEFAULT 0,
  -- Cash
  cash_balance NUMERIC(18,2) DEFAULT 0,
  -- Turnover ratios
  ar_turnover NUMERIC(8,2) DEFAULT 0,
  ap_turnover NUMERIC(8,2) DEFAULT 0,
  inventory_turnover NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, day)
);

-- 3) central_metric_facts_summary - Precomputed aggregates for facts (replaces useFactsSummary client-side SUM)
CREATE TABLE IF NOT EXISTS public.central_metric_facts_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  grain_type TEXT NOT NULL,
  -- Precomputed aggregates
  total_items INTEGER DEFAULT 0,
  total_revenue NUMERIC(18,2) DEFAULT 0,
  total_cost NUMERIC(18,2) DEFAULT 0,
  total_profit NUMERIC(18,2) DEFAULT 0,
  total_quantity NUMERIC(18,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_margin_percent NUMERIC(8,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, grain_type)
);

-- =============================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_finance_expenses_daily_tenant_day 
  ON public.finance_expenses_daily(tenant_id, day DESC);

CREATE INDEX IF NOT EXISTS idx_working_capital_daily_tenant_day 
  ON public.working_capital_daily(tenant_id, day DESC);

CREATE INDEX IF NOT EXISTS idx_central_metric_facts_summary_tenant_grain 
  ON public.central_metric_facts_summary(tenant_id, grain_type);

-- =============================================================
-- RLS POLICIES
-- =============================================================

ALTER TABLE public.finance_expenses_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_capital_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.central_metric_facts_summary ENABLE ROW LEVEL SECURITY;

-- Finance expenses daily policies
CREATE POLICY "Users can view own tenant finance_expenses_daily"
  ON public.finance_expenses_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu 
      WHERE tu.tenant_id = finance_expenses_daily.tenant_id 
      AND tu.user_id = auth.uid()
    )
  );

-- Working capital daily policies
CREATE POLICY "Users can view own tenant working_capital_daily"
  ON public.working_capital_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu 
      WHERE tu.tenant_id = working_capital_daily.tenant_id 
      AND tu.user_id = auth.uid()
    )
  );

-- Facts summary policies
CREATE POLICY "Users can view own tenant central_metric_facts_summary"
  ON public.central_metric_facts_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu 
      WHERE tu.tenant_id = central_metric_facts_summary.tenant_id 
      AND tu.user_id = auth.uid()
    )
  );

-- =============================================================
-- FUNCTION: Get expenses daily for date range
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_expenses_daily(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  day DATE,
  total_amount NUMERIC,
  cogs_amount NUMERIC,
  salary_amount NUMERIC,
  rent_amount NUMERIC,
  utilities_amount NUMERIC,
  marketing_amount NUMERIC,
  logistics_amount NUMERIC,
  depreciation_amount NUMERIC,
  interest_amount NUMERIC,
  tax_amount NUMERIC,
  other_amount NUMERIC,
  expense_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fed.day,
    fed.total_amount,
    fed.cogs_amount,
    fed.salary_amount,
    fed.rent_amount,
    fed.utilities_amount,
    fed.marketing_amount,
    fed.logistics_amount,
    fed.depreciation_amount,
    fed.interest_amount,
    fed.tax_amount,
    fed.other_amount,
    fed.expense_count
  FROM public.finance_expenses_daily fed
  WHERE fed.tenant_id = p_tenant_id
    AND fed.day >= p_start_date
    AND fed.day <= p_end_date
  ORDER BY fed.day DESC;
END;
$$;

-- =============================================================
-- FUNCTION: Get working capital daily for date range
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_working_capital_daily(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  day DATE,
  dso NUMERIC,
  dpo NUMERIC,
  dio NUMERIC,
  ccc NUMERIC,
  total_ar NUMERIC,
  overdue_ar NUMERIC,
  total_ap NUMERIC,
  overdue_ap NUMERIC,
  inventory NUMERIC,
  net_working_capital NUMERIC,
  cash_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wcd.day,
    wcd.dso,
    wcd.dpo,
    wcd.dio,
    wcd.ccc,
    wcd.total_ar,
    wcd.overdue_ar,
    wcd.total_ap,
    wcd.overdue_ap,
    wcd.inventory,
    wcd.net_working_capital,
    wcd.cash_balance
  FROM public.working_capital_daily wcd
  WHERE wcd.tenant_id = p_tenant_id
    AND wcd.day >= p_start_date
    AND wcd.day <= p_end_date
  ORDER BY wcd.day DESC;
END;
$$;

-- =============================================================
-- FUNCTION: Get facts summary by grain type
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_facts_summary(
  p_tenant_id UUID,
  p_grain_type TEXT
)
RETURNS TABLE (
  total_items INTEGER,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_profit NUMERIC,
  total_quantity NUMERIC,
  total_orders INTEGER,
  avg_margin_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cmfs.total_items,
    cmfs.total_revenue,
    cmfs.total_cost,
    cmfs.total_profit,
    cmfs.total_quantity,
    cmfs.total_orders,
    cmfs.avg_margin_percent
  FROM public.central_metric_facts_summary cmfs
  WHERE cmfs.tenant_id = p_tenant_id
    AND cmfs.grain_type = p_grain_type;
END;
$$;