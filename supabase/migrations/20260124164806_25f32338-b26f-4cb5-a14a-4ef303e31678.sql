-- ============================================
-- CDP LTV INTELLIGENCE ENGINE - Core Tables & Functions
-- ============================================

-- 1. Table to store user-configurable LTV model assumptions
CREATE TABLE IF NOT EXISTS cdp_ltv_model_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  
  -- Retention curve assumptions (by year)
  retention_year_1 numeric NOT NULL DEFAULT 0.60,
  retention_year_2 numeric NOT NULL DEFAULT 0.45,
  retention_year_3 numeric NOT NULL DEFAULT 0.35,
  retention_decay_rate numeric NOT NULL DEFAULT 0.85,
  
  -- AOV assumptions
  aov_growth_rate numeric NOT NULL DEFAULT 0.0,
  
  -- Discount rate for NPV calculation
  discount_rate numeric NOT NULL DEFAULT 0.12,
  
  -- Risk adjustment factor
  risk_multiplier numeric NOT NULL DEFAULT 1.0,
  
  -- Margin proxy (for revenue-to-profit conversion when COGS unavailable)
  margin_proxy numeric NOT NULL DEFAULT 0.45,
  
  -- Category-specific adjustments (JSON)
  category_adjustments jsonb DEFAULT '{}',
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  
  CONSTRAINT unique_model_per_tenant UNIQUE (tenant_id, model_name)
);

-- Enable RLS
ALTER TABLE cdp_ltv_model_assumptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's LTV models"
  ON cdp_ltv_model_assumptions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create LTV models for their tenant"
  ON cdp_ltv_model_assumptions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant's LTV models"
  ON cdp_ltv_model_assumptions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant's LTV models"
  ON cdp_ltv_model_assumptions FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Index for performance
CREATE INDEX idx_cdp_ltv_model_assumptions_tenant ON cdp_ltv_model_assumptions(tenant_id);
CREATE INDEX idx_cdp_ltv_model_assumptions_active ON cdp_ltv_model_assumptions(tenant_id, is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_cdp_ltv_model_assumptions_updated_at
  BEFORE UPDATE ON cdp_ltv_model_assumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Function to calculate customer LTV based on assumptions
-- ============================================

CREATE OR REPLACE FUNCTION cdp_calculate_customer_ltv(
  p_tenant_id uuid,
  p_model_id uuid DEFAULT NULL,
  p_horizon_months int DEFAULT 24
)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  ltv_12m numeric,
  ltv_24m numeric,
  ltv_36m numeric,
  base_value numeric,
  retention_factor numeric,
  aov_factor numeric,
  discount_factor numeric,
  risk_factor numeric,
  confidence_score numeric,
  calculation_method text,
  order_count int,
  first_order_date date,
  last_order_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model_id uuid;
  v_retention_y1 numeric;
  v_retention_y2 numeric;
  v_retention_y3 numeric;
  v_aov_growth numeric;
  v_discount_rate numeric;
  v_risk_multiplier numeric;
  v_margin_proxy numeric;
BEGIN
  -- Get model assumptions (active model or specified model)
  SELECT 
    m.id,
    m.retention_year_1,
    m.retention_year_2,
    m.retention_year_3,
    m.aov_growth_rate,
    m.discount_rate,
    m.risk_multiplier,
    m.margin_proxy
  INTO 
    v_model_id,
    v_retention_y1,
    v_retention_y2,
    v_retention_y3,
    v_aov_growth,
    v_discount_rate,
    v_risk_multiplier,
    v_margin_proxy
  FROM cdp_ltv_model_assumptions m
  WHERE m.tenant_id = p_tenant_id
    AND (p_model_id IS NULL AND m.is_active = true OR m.id = p_model_id)
  LIMIT 1;

  -- Use defaults if no model found
  IF v_model_id IS NULL THEN
    v_retention_y1 := 0.60;
    v_retention_y2 := 0.45;
    v_retention_y3 := 0.35;
    v_aov_growth := 0.0;
    v_discount_rate := 0.12;
    v_risk_multiplier := 1.0;
    v_margin_proxy := 0.45;
  END IF;

  RETURN QUERY
  WITH customer_base AS (
    SELECT 
      c.id AS cust_id,
      c.name AS cust_name,
      COUNT(DISTINCT o.id) AS total_orders,
      MIN(o.order_date)::date AS first_order,
      MAX(o.order_date)::date AS last_order,
      COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
      COALESCE(SUM(o.total_amount), 0) AS total_revenue,
      COALESCE(SUM(o.total_amount * v_margin_proxy), 0) AS total_gross_profit,
      EXTRACT(DAY FROM now() - MIN(o.order_date))::int AS days_since_first,
      EXTRACT(DAY FROM now() - MAX(o.order_date))::int AS days_since_last
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id 
      AND o.tenant_id = p_tenant_id
      AND o.status NOT IN ('cancelled', 'refunded')
    WHERE c.tenant_id = p_tenant_id
    GROUP BY c.id, c.name
    HAVING COUNT(DISTINCT o.id) > 0
  ),
  ltv_calculation AS (
    SELECT
      cb.cust_id,
      cb.cust_name,
      cb.total_orders,
      cb.first_order,
      cb.last_order,
      cb.avg_order_value,
      cb.total_gross_profit,
      cb.days_since_first,
      cb.days_since_last,
      CASE 
        WHEN cb.days_since_first > 30 THEN cb.total_gross_profit * (365.0 / cb.days_since_first)
        ELSE cb.total_gross_profit * 12
      END AS annual_base_value,
      CASE
        WHEN cb.total_orders >= 10 AND cb.days_since_first >= 180 THEN 0.90
        WHEN cb.total_orders >= 5 AND cb.days_since_first >= 90 THEN 0.75
        WHEN cb.total_orders >= 2 AND cb.days_since_first >= 30 THEN 0.60
        ELSE 0.40
      END AS confidence
    FROM customer_base cb
  )
  SELECT
    lc.cust_id AS customer_id,
    lc.cust_name AS customer_name,
    ROUND((lc.annual_base_value * v_retention_y1 * (1 + v_aov_growth) / (1 + v_discount_rate) * v_risk_multiplier)::numeric, 0) AS ltv_12m,
    ROUND((
      lc.annual_base_value * v_retention_y1 * (1 + v_aov_growth) / (1 + v_discount_rate) +
      lc.annual_base_value * v_retention_y2 * POWER(1 + v_aov_growth, 2) / POWER(1 + v_discount_rate, 2)
    ) * v_risk_multiplier, 0) AS ltv_24m,
    ROUND((
      lc.annual_base_value * v_retention_y1 * (1 + v_aov_growth) / (1 + v_discount_rate) +
      lc.annual_base_value * v_retention_y2 * POWER(1 + v_aov_growth, 2) / POWER(1 + v_discount_rate, 2) +
      lc.annual_base_value * v_retention_y3 * POWER(1 + v_aov_growth, 3) / POWER(1 + v_discount_rate, 3)
    ) * v_risk_multiplier, 0) AS ltv_36m,
    ROUND(lc.annual_base_value::numeric, 0) AS base_value,
    v_retention_y1 AS retention_factor,
    (1 + v_aov_growth) AS aov_factor,
    (1 + v_discount_rate) AS discount_factor,
    v_risk_multiplier AS risk_factor,
    lc.confidence AS confidence_score,
    'REVENUE_PROXY' AS calculation_method,
    lc.total_orders::int AS order_count,
    lc.first_order AS first_order_date,
    lc.last_order AS last_order_date
  FROM ltv_calculation lc
  ORDER BY ltv_24m DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION cdp_calculate_customer_ltv TO authenticated;

-- ============================================
-- 3. View: LTV by Cohort
-- ============================================

CREATE OR REPLACE VIEW v_cdp_ltv_by_cohort AS
WITH customer_cohorts AS (
  SELECT 
    c.tenant_id,
    c.id AS customer_id,
    DATE_TRUNC('month', MIN(o.order_date))::date AS cohort_month,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.total_amount) AS total_revenue,
    SUM(o.total_amount * 0.45) AS total_profit,
    MAX(o.order_date) AS last_order
  FROM customers c
  JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
  WHERE o.status NOT IN ('cancelled', 'refunded')
  GROUP BY c.tenant_id, c.id
),
cohort_summary AS (
  SELECT
    tenant_id,
    cohort_month,
    COUNT(*) AS cohort_size,
    AVG(total_revenue) AS avg_revenue,
    AVG(total_profit) AS avg_profit,
    AVG(order_count) AS avg_orders,
    COUNT(*) FILTER (WHERE last_order >= cohort_month + INTERVAL '3 months') * 100.0 / NULLIF(COUNT(*), 0) AS retention_3m,
    COUNT(*) FILTER (WHERE last_order >= cohort_month + INTERVAL '6 months') * 100.0 / NULLIF(COUNT(*), 0) AS retention_6m,
    COUNT(*) FILTER (WHERE last_order >= cohort_month + INTERVAL '12 months') * 100.0 / NULLIF(COUNT(*), 0) AS retention_12m
  FROM customer_cohorts
  GROUP BY tenant_id, cohort_month
),
cohort_with_trend AS (
  SELECT
    cs.*,
    LAG(avg_profit) OVER (PARTITION BY tenant_id ORDER BY cohort_month) AS prev_cohort_profit
  FROM cohort_summary cs
)
SELECT
  tenant_id,
  cohort_month,
  cohort_size::int,
  ROUND(avg_revenue::numeric, 0) AS avg_revenue,
  ROUND(avg_profit::numeric, 0) AS avg_profit,
  ROUND(avg_orders::numeric, 1) AS avg_orders,
  ROUND((avg_profit * 4 * COALESCE(retention_3m, 50) / 100)::numeric, 0) AS estimated_ltv_12m,
  ROUND((avg_profit * 8 * COALESCE(retention_6m, 40) / 100)::numeric, 0) AS estimated_ltv_24m,
  ROUND(COALESCE(retention_3m, 0)::numeric, 1) AS retention_rate_3m,
  ROUND(COALESCE(retention_6m, 0)::numeric, 1) AS retention_rate_6m,
  ROUND(COALESCE(retention_12m, 0)::numeric, 1) AS retention_rate_12m,
  CASE 
    WHEN prev_cohort_profit > 0 THEN ROUND(((avg_profit - prev_cohort_profit) / prev_cohort_profit * 100)::numeric, 1)
    ELSE 0
  END AS ltv_trend_vs_prev,
  CASE
    WHEN COALESCE(retention_3m, 0) >= 60 AND avg_orders >= 2 THEN 'high'
    WHEN COALESCE(retention_3m, 0) >= 40 AND avg_orders >= 1.5 THEN 'medium'
    ELSE 'low'
  END AS quality_score
FROM cohort_with_trend
WHERE cohort_month IS NOT NULL
ORDER BY cohort_month DESC;

-- ============================================
-- 4. View: LTV by Acquisition Source (using first order source)
-- ============================================

CREATE OR REPLACE VIEW v_cdp_ltv_by_source AS
WITH customer_first_order AS (
  SELECT DISTINCT ON (customer_id, tenant_id)
    customer_id,
    tenant_id,
    COALESCE(source, 'unknown') AS acquisition_source
  FROM orders
  WHERE status NOT IN ('cancelled', 'refunded')
  ORDER BY customer_id, tenant_id, order_date ASC
),
customer_metrics AS (
  SELECT 
    c.tenant_id,
    c.id AS customer_id,
    cfo.acquisition_source,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.total_amount) AS total_revenue,
    SUM(o.total_amount * 0.45) AS total_profit
  FROM customers c
  JOIN customer_first_order cfo ON cfo.customer_id = c.id AND cfo.tenant_id = c.tenant_id
  JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
  WHERE o.status NOT IN ('cancelled', 'refunded')
  GROUP BY c.tenant_id, c.id, cfo.acquisition_source
),
source_summary AS (
  SELECT
    tenant_id,
    acquisition_source,
    COUNT(*) AS customer_count,
    AVG(total_revenue) AS avg_revenue,
    AVG(total_profit) AS avg_profit,
    AVG(order_count) AS avg_orders,
    AVG(total_profit) * 4 * 0.5 AS avg_ltv_12m,
    AVG(total_profit) * 8 * 0.4 AS avg_ltv_24m
  FROM customer_metrics
  GROUP BY tenant_id, acquisition_source
)
SELECT
  tenant_id,
  acquisition_source,
  customer_count::int,
  ROUND(avg_revenue::numeric, 0) AS avg_revenue,
  ROUND(avg_profit::numeric, 0) AS avg_profit,
  ROUND(avg_orders::numeric, 1) AS avg_orders,
  ROUND(avg_ltv_12m::numeric, 0) AS avg_ltv_12m,
  ROUND(avg_ltv_24m::numeric, 0) AS avg_ltv_24m,
  0::numeric AS estimated_cac,
  NULL::numeric AS ltv_cac_ratio,
  NULL::numeric AS payback_months
FROM source_summary
WHERE customer_count >= 5
ORDER BY avg_ltv_24m DESC;

-- ============================================
-- 5. View: LTV Summary for Dashboard (using equity columns from cdp_customer_equity_computed)
-- ============================================

CREATE OR REPLACE VIEW v_cdp_ltv_summary AS
WITH ltv_data AS (
  SELECT 
    ce.tenant_id,
    ce.customer_id,
    ce.equity_12m AS ltv_12m,
    ce.equity_24m AS ltv_24m,
    ce.risk_level,
    -- Derive tier from equity
    CASE
      WHEN ce.equity_24m >= 50000000 THEN 'platinum'
      WHEN ce.equity_24m >= 20000000 THEN 'gold'
      WHEN ce.equity_24m >= 5000000 THEN 'silver'
      ELSE 'bronze'
    END AS tier
  FROM cdp_customer_equity_computed ce
  WHERE ce.equity_12m IS NOT NULL
)
SELECT
  tenant_id,
  COUNT(*) AS total_customers,
  SUM(ltv_12m) AS total_equity_12m,
  SUM(ltv_24m) AS total_equity_24m,
  ROUND(AVG(ltv_12m)::numeric, 0) AS avg_ltv_12m,
  ROUND(AVG(ltv_24m)::numeric, 0) AS avg_ltv_24m,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ltv_12m)::numeric, 0) AS median_ltv_12m,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ltv_24m)::numeric, 0) AS median_ltv_24m,
  SUM(ltv_12m) FILTER (WHERE risk_level = 'high') AS at_risk_equity,
  COUNT(*) FILTER (WHERE risk_level = 'high') AS at_risk_count,
  COUNT(*) FILTER (WHERE tier = 'platinum') AS platinum_count,
  COUNT(*) FILTER (WHERE tier = 'gold') AS gold_count,
  COUNT(*) FILTER (WHERE tier = 'silver') AS silver_count,
  COUNT(*) FILTER (WHERE tier = 'bronze') AS bronze_count
FROM ltv_data
GROUP BY tenant_id;

-- ============================================
-- 6. Insert default model for existing tenants
-- ============================================

INSERT INTO cdp_ltv_model_assumptions (tenant_id, model_name, description, is_active)
SELECT 
  t.id,
  'Base Model',
  'Mô hình LTV mặc định với giả định retention 60%, không tăng trưởng AOV, discount rate 12%',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM cdp_ltv_model_assumptions m WHERE m.tenant_id = t.id
)
ON CONFLICT (tenant_id, model_name) DO NOTHING;